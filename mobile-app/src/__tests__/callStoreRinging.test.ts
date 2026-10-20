import { NativeModules } from 'react-native';
const mockListeners: Record<string, (...args: any[]) => void> = {};
const mockSignaling = {
  connect: jest.fn(), disconnect: jest.fn(),
  onOffer: jest.fn(cb => { mockListeners.offer = cb; }),
  onIncomingCall: jest.fn(cb => { mockListeners.incoming = cb; }),
  onHangUp: jest.fn(cb => { mockListeners.ended = cb; }),
  onReject: jest.fn(cb => { mockListeners.rejected = cb; }),
  joinAsCallee: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../services/callSignalingClient', () => ({ RealCallSignalingClient: jest.fn(() => mockSignaling) }));
jest.mock('../services/callService', () => ({ CallEngine: jest.fn((_client, callId) => ({
  getCallId: () => callId, acceptIncoming: jest.fn().mockResolvedValue(undefined), hangUp: jest.fn().mockResolvedValue(undefined),
})) }));
jest.mock('react-native-incall-manager', () => ({ startRingtone: jest.fn(), stopRingtone: jest.fn() }));
import { useCallStore } from '../stores/callStore';
import { CallEngine } from '../services/callService';
const id = 'a'.repeat(32);
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  NativeModules.CallPush = { dismiss: jest.fn() };
  useCallStore.getState().connect('dev-b');
});
afterEach(() => { useCallStore.getState().disconnect(); jest.useRealTimers(); });
it('WS plus native/resume delivery creates one call engine', () => {
  mockListeners.incoming(id, 'Alice', 'audio');
  useCallStore.getState().receiveIncomingCall(id, 'Alice', 'audio');
  expect(CallEngine).toHaveBeenCalledTimes(1);
});
it('expires an unanswered call and removes the native notification', () => {
  mockListeners.incoming(id, 'Alice', 'audio', Math.floor(Date.now() / 1000) + 10);
  jest.advanceTimersByTime(10000);
  expect(useCallStore.getState().activeCall).toBeNull();
  expect(NativeModules.CallPush.dismiss).toHaveBeenCalledWith(id);
});
it('ignores an invite which already expired while offline', () => {
  mockListeners.incoming(id, 'Alice', 'audio', Math.floor(Date.now() / 1000) - 1);
  expect(useCallStore.getState().activeCall).toBeNull();
});
it('caller cancellation clears the unanswered ring immediately', () => {
  mockListeners.incoming(id, 'Alice', 'audio');
  mockListeners.ended(id);
  expect(useCallStore.getState().activeCall).toBeNull();
});
it('duplicate answer actions only join once and the ringing timer cannot end the accepted call', async () => {
  mockListeners.incoming(id, 'Alice', 'audio');
  mockListeners.offer(id, { type: 'offer', sdp: 'test' });
  await Promise.all([useCallStore.getState().acceptIncomingCall(), useCallStore.getState().acceptIncomingCall()]);
  expect(mockSignaling.joinAsCallee).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(50000);
  expect(useCallStore.getState().activeCall?.engine.getCallId()).toBe(id);
});
