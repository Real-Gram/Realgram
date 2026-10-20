/**
 * callStore — app-wide calling state (Khabat, 2026-07-28: "ringe knappen
 * skal fungere ikke bare når Inbox er åpen ... sånn som IMO/WhatsApp").
 *
 * One RealCallSignalingClient connection per app session, owned here
 * instead of by whichever screen happens to be open — CallManager
 * (navigation/AppNavigator.tsx, mounted alongside DeepLinkHandler/
 * NotificationRouteHandler, i.e. for the app's whole foreground
 * lifetime, not tied to any one screen) connects it once and renders
 * CallScreen whenever activeCall is set, regardless of what tab/screen
 * is currently showing. InboxScreen's call button just calls
 * startOutgoingCall() — it doesn't hold any calling state of its own
 * anymore.
 *
 * Android background ringing is handled by CallMessagingService + CallStyle,
 * with callPushService validating the durable session on resume. iOS still
 * needs PushKit/CallKit before it can ring outside the foreground.
 */

import { create } from 'zustand';
import { AppState, NativeModules, Vibration } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { CallEngine, RTCSessionDescriptionInitLike } from '../services/callService';
import { RealCallSignalingClient } from '../services/callSignalingClient';
import { useToastStore } from './toastStore';

// Distinct from the single "tap" haptic used elsewhere in the app (coin
// forge, etc.) — a repeating long-short-short pulse so an incoming call
// reads as different from every other haptic in RealGram at a glance
// (eyes-free), closer to how a real phone's ring cadence feels than a
// single buzz. Runs alongside the real audio ringtone below now (Khabat,
// 2026-07-30, supplied the actual asset — see InCallManager.startRingtone
// calls below), not instead of it; kept as its own cue for a
// silenced/vibrate-mode phone.
const RING_PATTERN = [0, 400, 200, 400, 200, 800];

let client: RealCallSignalingClient | null = null;
let clientDeviceId = '';
let accepting = false;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
function stopRinging() {
  if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
  Vibration.cancel();
  InCallManager.stopRingtone();
}
const pendingOffers = new Map<string, RTCSessionDescriptionInitLike>();

interface ActiveCall {
  engine:     CallEngine;
  peerLabel:  string;
  /** The real Realgram ID used for signaling/messaging — distinct from
   *  peerLabel, which InboxScreen sometimes passes as a friendly
   *  conversation title instead. Needed by CallScreen to log a call-log
   *  message to the right DM thread once the call ends (Khabat,
   *  2026-07-31: "det skal stå i melding chat at: ubesvart call..."). */
  peerId:     string;
  outgoing:   boolean;
}

interface CallState {
  activeCall: ActiveCall | null;
  /** Idempotent — safe to call on every render of whatever mounts
   *  CallManager; only actually (re)connects when deviceId changes. */
  connect: (deviceId: string) => void;
  disconnect: () => void;
  clearUnansweredCall: () => void;
  receiveIncomingCall: (callId: string, callerId: string, kind: 'audio' | 'video', expiresAt?: number) => void;
  startOutgoingCall: (peerId: string, peerLabel: string, video?: boolean) => void;
  acceptIncomingCall: () => Promise<void>;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,

  connect: (deviceId: string) => {
    if (!deviceId || clientDeviceId === deviceId) return;
    client?.disconnect();
    client = new RealCallSignalingClient(deviceId);
    clientDeviceId = deviceId;
    client.connect();

    client.onOffer((callId, sdp) => pendingOffers.set(callId, sdp));
    client.onIncomingCall((callId, callerUserId, kind, expiresAt) => {
      get().receiveIncomingCall(callId, callerUserId, kind, expiresAt);
    });
    const ended = (callId: string) => {
      if (get().activeCall?.engine.getCallId() !== callId) return;
      get().clearUnansweredCall();
      stopRinging();
      NativeModules.CallPush?.dismiss(callId);
    };
    client.onHangUp(ended);
    client.onReject(ended);
  },

  clearUnansweredCall: () => {
    const call = get().activeCall;
    if (!call || call.outgoing || !ringTimer) return;
    stopRinging();
    NativeModules.CallPush?.dismiss(call.engine.getCallId());
    pendingOffers.delete(call.engine.getCallId());
    set({ activeCall: null });
  },

  receiveIncomingCall: (callId, callerId, kind, expiresAt) => {
    if (!client || get().activeCall) return; // WS + FCM/resume must create only one engine.
    const remaining = expiresAt ? expiresAt * 1000 - Date.now() : 45_000;
    if (remaining <= 0) return;
    stopRinging();
    if (AppState.currentState === 'active') {
      Vibration.vibrate(RING_PATTERN, true);
      InCallManager.startRingtone('_BUNDLE_', 0, 'default', -1);
    }
    const engine = new CallEngine(client, callId, callerId, () => {}, () => {}, kind === 'video');
    set({ activeCall: { engine, peerLabel: callerId, peerId: callerId, outgoing: false } });
    ringTimer = setTimeout(() => {
      if (get().activeCall?.engine.getCallId() !== callId) return;
      stopRinging();
      NativeModules.CallPush?.dismiss(callId);
      set({ activeCall: null });
      pendingOffers.delete(callId);
    }, Math.min(remaining, 45_000));
  },

  disconnect: () => {
    client?.disconnect();
    client = null;
    clientDeviceId = '';
    accepting = false;
    pendingOffers.clear();
    stopRinging();
    set({ activeCall: null });
  },

  startOutgoingCall: (peerId: string, peerLabel: string, video = false) => {
    if (!peerId || get().activeCall) return;
    // `client` is only ever null if connect() itself was never called (auth
    // not ready yet when CallManager mounted, or calling disabled for this
    // account) -- a real, if rare, gap: silently doing nothing on tap read
    // as "the call button is slow" in Khabat's 2026-07-29 test, when it was
    // actually a dead tap followed by a working one once connect() caught
    // up. Once `client` exists, CallEngine.startOutgoing() already awaits
    // the WebSocket handshake internally (ensureConnected()) before sending
    // anything, so a slow-but-connecting client doesn't need special
    // handling here -- only a genuinely absent one does.
    if (!client) {
      useToastStore.getState().show('Calling isn’t ready yet — try again in a moment', 'error');
      return;
    }
    const engine = new CallEngine(client, '', peerId, () => {}, () => {}, video);
    set({ activeCall: { engine, peerLabel, peerId, outgoing: true } });
  },

  acceptIncomingCall: async () => {
    const { activeCall } = get();
    if (!client || !activeCall) throw new Error('no active call');
    if (activeCall.outgoing || accepting) return;
    accepting = true;
    stopRinging();
    const callId = activeCall.engine.getCallId();
    NativeModules.CallPush?.dismiss(callId);
    // client.joinAsCallee() below calls call-accept, which marks the
    // call_sessions row 'accepted' server-side — from this point on the
    // server considers both devices "on a call" (call_active_for()) until
    // something explicitly ends it. Everything after this line used to be
    // able to throw (offer timeout, WebRTC/mic failure in acceptIncoming())
    // with only a local .catch(() => setState('ended')) in CallScreen —
    // that's local-only, the server never heard about it. Found live,
    // 2026-07-30: a call that failed this way left an 'accepted' row with
    // no ended_at forever (the 45s stale sweep only covers 'ringing'), so
    // every subsequent call_initiate() from either party hit "you are
    // already on a call" / "recipient is on another call" indefinitely —
    // exactly Khabat's "tap it, it flashes for a second, goes away" report.
    // Wrapping so any failure here still tells the server the call is over.
    try {
      await client.joinAsCallee(callId);

      const offer = await new Promise<RTCSessionDescriptionInitLike>((resolve, reject) => {
        const existing = pendingOffers.get(callId);
        if (existing) { resolve(existing); return; }
        const started = Date.now();
        const interval = setInterval(() => {
          const found = pendingOffers.get(callId);
          if (found) { clearInterval(interval); resolve(found); return; }
          if (Date.now() - started > 15000) { clearInterval(interval); reject(new Error('offer timed out')); }
        }, 200);
      });
      pendingOffers.delete(callId);
      await activeCall.engine.acceptIncoming(offer);
    } catch (err) {
      pendingOffers.delete(callId);
      await activeCall.engine.hangUp().catch(() => {});
      set({ activeCall: null });
      throw err;
    } finally { accepting = false; }
  },

  endCall: () => {
    const id = get().activeCall?.engine.getCallId();
    if (id) { NativeModules.CallPush?.dismiss(id); pendingOffers.delete(id); }
    stopRinging();
    set({ activeCall: null });
  },
}));
