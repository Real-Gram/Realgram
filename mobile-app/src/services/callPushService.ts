import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { RealCallSignalingClient } from './callSignalingClient';
import { useCallStore } from '../stores/callStore';

export interface PendingCall { call_id: string; caller_user_id: string; kind: 'audio' | 'video'; expires_at: number; }

/** Shared by resume and push: never trust the launch extras as call authority. */
export function validPendingCall(call: PendingCall | null, now = Date.now()): call is PendingCall {
  return !!call && /^[a-f0-9]{32}$/.test(call.call_id) && call.expires_at * 1000 > now;
}

export function startCallPush(deviceId: string): () => void {
  const native = Platform.OS === 'android' ? NativeModules.CallPush : null;
  let stopped = false;
  let syncing = false;
  let again = false;
  const sync = async () => {
    if (stopped || AppState.currentState !== 'active') return;
    if (syncing) { again = true; return; }
    syncing = true;
    try {
      // Delivery must recover even when the foreground socket missed the invite.
      const call = await RealCallSignalingClient.pendingCall(deviceId);
      if (stopped) return;
      const action = native ? await native.consumeAction() : null;
      if (stopped) return;
      if (action?.callId && action.callId !== call?.call_id) native?.dismiss(action.callId);
      if (validPendingCall(call)) {
        useCallStore.getState().receiveIncomingCall(call.call_id, call.caller_user_id, call.kind, call.expires_at);
        native?.dismiss(call.call_id);
        if (action?.callId === call.call_id && action?.action === 'answer') await useCallStore.getState().acceptIncomingCall();
      } else {
        useCallStore.getState().clearUnansweredCall();
      }
      const token = native ? await native.configure(deviceId, true) : null;
      if (token && !stopped) await RealCallSignalingClient.registerPush(deviceId, token);
    } catch { /* Foreground calling remains usable while push is unavailable. */ }
    finally {
      syncing = false;
      if (again) { again = false; void sync(); }
    }
  };
  void sync();
  const state = AppState.addEventListener('change', next => { if (next === 'active') void sync(); });
  const event = native ? new NativeEventEmitter(native).addListener('RealGramCallPush', () => { void sync(); }) : null;
  const timer = setInterval(() => { void sync(); }, 240_000);
  return () => {
    stopped = true;
    clearInterval(timer); state.remove(); event?.remove();
    // Disassociate on logout/account change. Ignore future pushes for the old ID.
    native?.configure('', false).catch(() => {});
  };
}
