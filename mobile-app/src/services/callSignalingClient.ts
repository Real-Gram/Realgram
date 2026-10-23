import { IS_DESIGN_PREVIEW } from '../config/designPreview';
import { previewRequest } from '../preview/previewData';
/**
 * callSignalingClient — the real CallSignalingClient implementation
 * (services/callService.ts's interface) against the backend agent B built
 * (docs/realgram/TASK_SPLIT.md B→A(171)): lib/calling.php (auth, vouchers,
 * call lifecycle, TURN credentials) + calling-relay/ (a separate Node
 * WebSocket process that relays opaque SDP/ICE payloads between the two
 * sides of a call once each has joined with a voucher PHP signed).
 *
 * PHP has no persistent connection to a client, so this file talks to two
 * different places: plain HTTPS POST/GET to api.php for anything durable
 * (initiate/accept/decline/end/ice-servers), and a single long-lived
 * WebSocket to the relay for anything real-time (presence, the actual
 * offer/answer/ICE exchange, incoming-call push).
 *
 * One connection per app session, not per call — `connect()` should be
 * called once (e.g. when the Inbox screen mounts) and reused across
 * however many calls happen while it's open.
 */

import {
  CallSignalingClient, RTCIceCandidateInitLike, RTCIceServerLike, RTCSessionDescriptionInitLike,
} from './callService';

const BASE_URL   = 'https://api.realgram.no/api.php';
const TOKEN      = 'realgram-mobile-diag-v1';
const TIMEOUT    = 10_000;
// Dedicated upgrade route on the canonical API host; nginx proxies HTTP/1.1
// WebSocket frames to the calling relay. Verify this route before releasing.
const WS_URL     = 'wss://api.realgram.no/ws/call';
const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000];

async function callGet(action: string, params: Record<string, string>): Promise<any> {
  if (IS_DESIGN_PREVIEW) return previewRequest(action, params);
  const qs = new URLSearchParams({ mobile: '1', action, _token: TOKEN, ...params });
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res  = await fetch(`${BASE_URL}?${qs.toString()}`, { signal: ctrl.signal });
    const json = await res.json() as { ok: boolean; data?: any; error?: string };
    if (!json.ok) throw new Error(json.error ?? 'request failed');
    return json.data;
  } finally {
    clearTimeout(tid);
  }
}

async function callPost(action: string, queryParams: Record<string, string>, body: Record<string, string>): Promise<any> {
  if (IS_DESIGN_PREVIEW) return previewRequest(action, body);
  const qs = new URLSearchParams({ mobile: '1', action, ...queryParams });
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res  = await fetch(`${BASE_URL}?${qs.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _token: TOKEN, ...body }).toString(),
      signal: ctrl.signal,
    });
    const json = await res.json() as { ok: boolean; data?: any; error?: string };
    if (!json.ok) throw new Error(json.error ?? 'request failed');
    return json.data;
  } finally {
    clearTimeout(tid);
  }
}

type EventCb = (...args: any[]) => void;

export interface CallHistoryEntry {
  call_id: string; direction: 'in' | 'out'; peer_device: string; peer_user_id: string;
  kind: 'audio' | 'video'; status: string; end_reason: string; duration_secs: number; started_at: string;
}
export class RealCallSignalingClient implements CallSignalingClient {
  static async history(deviceId: string): Promise<CallHistoryEntry[]> {
    const data = await callGet('call-history', { device_id: deviceId, limit: '50' });
    if (!Array.isArray(data?.calls)) throw new Error('Call history unavailable');
    return data.calls;
  }
  private ws: WebSocket | null = null;
  private wsReady: Promise<void> | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  private presenceToken = '';

  private listeners: Record<string, EventCb[]> = {
    incomingCall: [], offer: [], answer: [], iceCandidate: [], reject: [], hangUp: [], screenShareState: [],
  };

  /** 'audio' if a `call:incoming` push ever omits `kind` (shouldn't happen —
   *  lib/calling.php's call_initiate() always stores/pushes one — but this
   *  client shouldn't crash or silently request camera access on a bad/old
   *  payload). */
  private static normalizeKind(kind: unknown): 'audio' | 'video' {
    return kind === 'video' ? 'video' : 'audio';
  }

  // The relay only forwards call:signal to a peer that has already
  // joined the room (server.js: "if (peerWs) send(...)" -- no queuing on
  // its side). The caller joins right after placeCall(); the callee only
  // joins once the user taps Accept, which can be seconds into ringing --
  // so an offer sent immediately after createOffer() would silently be
  // dropped. Queue outgoing signals per callId until call:peer_joined
  // confirms the other side is actually in the room.
  private peerJoined = new Set<string>();
  private pendingSignals = new Map<string, Array<Record<string, unknown>>>();

  static async pendingCall(deviceId: string): Promise<import('./callPushService').PendingCall | null> {
    const data = await callGet('call-pending', { device_id: deviceId });
    return data.call ?? null;
  }

  static async registerPush(deviceId: string, token: string): Promise<void> {
    const data = await callGet('call-presence-token', { device_id: deviceId });
    if (!data.enabled || !data.token) return;
    await callPost('call-register-push', {}, { device_id: deviceId, proof: data.token, push_token: token, enabled: '1' });
  }

  constructor(private readonly deviceId: string) {}

  /** Call once (e.g. Inbox screen mount). Safe to call again — a no-op if
   *  already connected/connecting. */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.closedByUser = false;
    this.openSocket();
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.wsReady = null;
  }

  private openSocket(): void {
    // ensureConnected() can trigger a fresh openSocket() call while a
    // backoff reconnect is already scheduled (e.g. placeCall racing a drop
    // that happened moments earlier) — cancel the pending one so we never
    // end up with two live sockets and this.ws silently pointing at
    // whichever one happened to resolve last.
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const ready = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      this.ws = ws;
      const timeout = setTimeout(() => { reject(new Error('Call connection timed out')); ws.close(); }, TIMEOUT);
      ws.onopen = async () => {
        if (this.ws !== ws || this.closedByUser) { ws.close(); return; }
        try {
          const { token } = await callGet('call-presence-token', { device_id: this.deviceId });
          if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) return;
          if (!token) throw new Error('Calling unavailable');
          this.presenceToken = token;
          ws.send(JSON.stringify({ type: 'presence:auth', token }));
        } catch (error) {
          reject(error);
          ws.close();
        }
      };
      ws.onmessage = event => {
        if (this.ws !== ws) return;
        let message: any;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'presence:ok') {
          clearTimeout(timeout);
          this.reconnectAttempt = 0;
          resolve();
        } else if (message.type === 'presence:error') {
          reject(new Error('Call authentication failed')); ws.close();
        } else this.handleMessage(event.data);
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        reject(new Error('Call connection closed'));
        // A late close from an old socket must not discard its replacement.
        if (this.ws !== ws) return;
        this.ws = null;
        this.wsReady = null;
        if (this.closedByUser) return;
        const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
        this.reconnectAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          if (!this.closedByUser) this.openSocket();
        }, delay);
      };
      ws.onerror = () => { reject(new Error('Call connection failed')); ws.close(); };
    });
    this.wsReady = ready;
    // connect() is deliberately fire-and-forget; callers still await the
    // original rejecting promise via ensureConnected(), without unhandled errors.
    void ready.catch(() => {});
  }

  private handleMessage(raw: string): void {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'call:incoming':
        this.listeners.incomingCall.forEach((cb) => cb(msg.call_id, msg.caller_user_id, RealCallSignalingClient.normalizeKind(msg.kind), typeof msg.expires_at === 'number' ? msg.expires_at : undefined));
        break;
      case 'call:signal': {
        const p = msg.payload;
        if (!p) break;
        if (p.kind === 'offer') this.listeners.offer.forEach((cb) => cb(msg.call_id, { type: 'offer', sdp: p.sdp }));
        else if (p.kind === 'answer') this.listeners.answer.forEach((cb) => cb(msg.call_id, { type: 'answer', sdp: p.sdp }));
        else if (p.kind === 'ice') this.listeners.iceCandidate.forEach((cb) => cb(msg.call_id, p.candidate));
        else if (p.kind === 'screen-share-state') {
          this.listeners.screenShareState.forEach((cb) => cb(msg.call_id, !!p.active, p.trackId));
        }
        break;
      }
      case 'call:declined':
        this.listeners.reject.forEach((cb) => cb(msg.call_id));
        break;
      case 'call:peer_left':
      case 'call:ended':
        this.listeners.hangUp.forEach((cb) => cb(msg.call_id));
        this.peerJoined.delete(msg.call_id);
        this.pendingSignals.delete(msg.call_id);
        break;
      case 'call:peer_joined':
        this.peerJoined.add(msg.call_id);
        this.flushPendingSignals(msg.call_id);
        break;
      default:
        break;
    }
  }

  private flushPendingSignals(callId: string): void {
    const queued = this.pendingSignals.get(callId);
    if (!queued) return;
    this.pendingSignals.delete(callId);
    queued.forEach((payload) => this.wsSend({ type: 'call:signal', call_id: callId, payload }));
  }

  private async ensureConnected(): Promise<void> {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) this.connect();
    const socket = this.ws;
    await this.wsReady;
    if (this.ws !== socket || socket?.readyState !== WebSocket.OPEN) throw new Error('Call connection lost');
  }

  private wsSend(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  private sendSignal(callId: string, payload: Record<string, unknown>): void {
    // ICE candidates trickle in continuously, including after the peer has
    // already joined -- only the very first offer/answer needs the queue;
    // once peerJoined is set for this call, everything sends immediately.
    if (this.peerJoined.has(callId)) {
      this.wsSend({ type: 'call:signal', call_id: callId, payload });
      return;
    }
    const queue = this.pendingSignals.get(callId) ?? [];
    queue.push(payload);
    this.pendingSignals.set(callId, queue);
  }

  // ── CallSignalingClient ────────────────────────────────────────────────

  async placeCall(calleeDeviceId: string, kind: 'audio' | 'video' = 'audio'): Promise<{ callId: string }> {
    await this.ensureConnected();
    const data = await callPost('call-initiate', {}, {
      device_id: this.deviceId, peer: calleeDeviceId, kind,
    });
    // call-initiate is a plain HTTPS round-trip (can take seconds on a bad
    // connection) during which the WS can drop and start reconnecting —
    // re-check right before sending rather than trusting the socket that
    // was open when ensureConnected() was first called above. wsSend()
    // silently no-ops on a non-OPEN socket, and this join is not queued
    // anywhere else, so skipping this second wait meant the caller could
    // place a call that rings/accepts over REST but never actually joins
    // the signaling room — connects with no audio. Found live 2026-07-30.
    await this.ensureConnected();
    this.wsSend({ type: 'call:join', voucher: data.voucher });
    return { callId: data.call_id };
  }

  async sendOffer(callId: string, sdp: RTCSessionDescriptionInitLike): Promise<void> {
    this.sendSignal(callId, { kind: 'offer', sdp: sdp.sdp });
  }

  async sendAnswer(callId: string, sdp: RTCSessionDescriptionInitLike): Promise<void> {
    this.sendSignal(callId, { kind: 'answer', sdp: sdp.sdp });
  }

  async sendIceCandidate(callId: string, candidate: RTCIceCandidateInitLike): Promise<void> {
    this.sendSignal(callId, { kind: 'ice', candidate });
  }

  async sendScreenShareState(callId: string, active: boolean, trackId?: string): Promise<void> {
    this.sendSignal(callId, { kind: 'screen-share-state', active, trackId });
  }

  /** Callee side, once onIncomingCall fires: mints this device's own
   *  voucher and joins the relay room as callee. Not part of
   *  CallSignalingClient's interface (CallEngine's acceptIncoming doesn't
   *  need to know vouchers exist) — call this first, from wherever
   *  onIncomingCall is handled, before constructing a CallEngine. */
  async joinAsCallee(callId: string): Promise<void> {
    await this.ensureConnected();
    const data = await callPost('call-callee-voucher', {}, { device_id: this.deviceId, call_id: callId });
    // Same race as placeCall() above — re-confirm the socket is actually
    // open right before the join, not just when this method started.
    await this.ensureConnected();
    this.wsSend({ type: 'call:join', voucher: data.voucher });
    await callPost('call-accept', {}, { device_id: this.deviceId, call_id: callId });
  }

  async reject(callId: string): Promise<void> {
    await callPost('call-decline', {}, { device_id: this.deviceId, call_id: callId });
  }

  async hangUp(callId: string, reason = 'hangup'): Promise<void> {
    await callPost('call-end', {}, { device_id: this.deviceId, call_id: callId, reason });
  }

  async getIceServers(callId: string): Promise<RTCIceServerLike[]> {
    const data = await callGet('call-ice-servers', { device_id: this.deviceId, call_id: callId });
    return data.ice_servers ?? [];
  }

  onIncomingCall(cb: (callId: string, callerDeviceId: string, kind: 'audio' | 'video', expiresAt?: number) => void): () => void {
    this.listeners.incomingCall.push(cb);
    return () => { this.listeners.incomingCall = this.listeners.incomingCall.filter((c) => c !== cb); };
  }
  onOffer(cb: (callId: string, sdp: RTCSessionDescriptionInitLike) => void): () => void {
    this.listeners.offer.push(cb);
    return () => { this.listeners.offer = this.listeners.offer.filter((c) => c !== cb); };
  }
  onAnswer(cb: (callId: string, sdp: RTCSessionDescriptionInitLike) => void): () => void {
    this.listeners.answer.push(cb);
    return () => { this.listeners.answer = this.listeners.answer.filter((c) => c !== cb); };
  }
  onIceCandidate(cb: (callId: string, candidate: RTCIceCandidateInitLike) => void): () => void {
    this.listeners.iceCandidate.push(cb);
    return () => { this.listeners.iceCandidate = this.listeners.iceCandidate.filter((c) => c !== cb); };
  }
  onScreenShareState(cb: (callId: string, active: boolean, trackId?: string) => void): () => void {
    this.listeners.screenShareState.push(cb);
    return () => { this.listeners.screenShareState = this.listeners.screenShareState.filter((c) => c !== cb); };
  }
  onReject(cb: (callId: string) => void): () => void {
    this.listeners.reject.push(cb);
    return () => { this.listeners.reject = this.listeners.reject.filter((c) => c !== cb); };
  }
  onHangUp(cb: (callId: string) => void): () => void {
    this.listeners.hangUp.push(cb);
    return () => { this.listeners.hangUp = this.listeners.hangUp.filter((c) => c !== cb); };
  }
}
