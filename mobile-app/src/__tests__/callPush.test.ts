jest.mock('../stores/callStore', () => ({ useCallStore: { getState: jest.fn() } }));
jest.mock('../services/callSignalingClient', () => ({ RealCallSignalingClient: {} }));
import { validPendingCall } from '../services/callPushService';

it('accepts only a valid, unexpired server call', () => {
  const call = { call_id: 'a'.repeat(32), caller_user_id: 'Alice', kind: 'audio' as const, expires_at: 200 };
  expect(validPendingCall(call, 100000)).toBe(true);
  expect(validPendingCall({ ...call, expires_at: 100 }, 100000)).toBe(false);
  expect(validPendingCall({ ...call, call_id: 'forged' }, 100000)).toBe(false);
  expect(validPendingCall(null, 100000)).toBe(false);
});
