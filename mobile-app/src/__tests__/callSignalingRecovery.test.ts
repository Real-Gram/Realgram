jest.mock('../services/callService', () => ({}));
import { RealCallSignalingClient } from '../services/callSignalingClient';
class Socket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  static instances: Socket[] = [];
  readyState = 0;
  onopen: any; onclose: any; onmessage: any; onerror: any;
  send = jest.fn();
  constructor(_url: string) { Socket.instances.push(this); }
  close() { this.readyState = 3; this.onclose?.(); }
  async open() { this.readyState = 1; await this.onopen?.(); }
  message(type: string, extra = {}) { this.onmessage?.({ data: JSON.stringify({ type, ...extra }) }); }
}
const fetchMock = jest.fn();
beforeEach(() => {
  jest.useFakeTimers(); Socket.instances = [];
  (globalThis as any).WebSocket = Socket;
  (globalThis as any).fetch = fetchMock;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({ json: async () => ({ ok: true, data: url.includes('presence-token') ? { token: 'signed-proof' } : { call_id: 'a'.repeat(32), voucher: 'caller-proof' } }) }));
});
afterEach(() => jest.useRealTimers());
it('waits for authenticated presence before initiating a call', async () => {
  const client = new RealCallSignalingClient('dev-a');
  const placed = client.placeCall('Bob', 'audio');
  const socket = Socket.instances[0];
  await socket.open();
  expect(fetchMock.mock.calls.some(call => call[0].includes('call-initiate'))).toBe(false);
  socket.message('presence:ok');
  await placed;
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'call:join', voucher: 'caller-proof' }));
  client.disconnect();
});
it('rejects promptly when the app wakes into a closed handshake', async () => {
  const client = new RealCallSignalingClient('dev-a');
  const placed = client.placeCall('Bob', 'audio');
  const assertion = expect(placed).rejects.toThrow('Call connection closed');
  Socket.instances[0].close();
  await assertion;
  client.disconnect();
});
it('a late close from an old socket cannot clear the new connection', async () => {
  const client = new RealCallSignalingClient('dev-a');
  client.connect();
  const old = Socket.instances[0];
  old.readyState = Socket.CLOSED;
  client.connect();
  const replacement = Socket.instances[1];
  old.onclose();
  await replacement.open(); replacement.message('presence:ok');
  await client.placeCall('Bob', 'audio');
  expect(replacement.send).toHaveBeenCalledWith(JSON.stringify({ type: 'call:join', voucher: 'caller-proof' }));
  client.disconnect();
});
it('a handshake timeout rejects instead of leaving the answer button stuck', async () => {
  const client = new RealCallSignalingClient('dev-a');
  const placed = client.placeCall('Bob', 'audio');
  const assertion = expect(placed).rejects.toThrow('Call connection timed out');
  jest.advanceTimersByTime(10000);
  await assertion;
  client.disconnect();
});
