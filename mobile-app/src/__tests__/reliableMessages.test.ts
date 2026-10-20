jest.mock('../services/entitlementService', () => ({ sendMessage: jest.fn(), listMessages: jest.fn() }));
jest.mock('../services/dmNotifications', () => ({ notifyNewIncoming: jest.fn().mockResolvedValue(0) }));
import { useDMStore } from '../stores/dmStore';
import { sendMessage, listMessages } from '../services/entitlementService';
const send = sendMessage as jest.Mock;
const list = listMessages as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  useDMStore.setState({ messages: [], pendingSends: [], sending: false });
  list.mockResolvedValue([]);
});

it('reuses the same id after an ambiguous network failure, then clears the receipt on ack', async () => {
  send.mockRejectedValueOnce(new Error('network lost')).mockResolvedValueOnce({ message_id: 1 });
  await expect(useDMStore.getState().send('dev-a', 'Bob', 'hello')).rejects.toThrow('network lost');
  const firstId = send.mock.calls[0][4];
  expect(useDMStore.getState().pendingSends).toHaveLength(1);
  await useDMStore.getState().send('dev-a', 'Bob', 'hello');
  expect(send.mock.calls[1][4]).toBe(firstId);
  expect(useDMStore.getState().pendingSends).toHaveLength(0);
});
it('assigns a new id to an intentional repeat after successful delivery', async () => {
  send.mockResolvedValue({ message_id: 1 });
  await useDMStore.getState().send('dev-a', 'Bob', 'hello');
  await useDMStore.getState().send('dev-a', 'Bob', 'hello');
  expect(send.mock.calls[1][4]).not.toBe(send.mock.calls[0][4]);
});
it('ignores an old inbox response arriving after a newer refresh', async () => {
  let old: (value: unknown) => void = () => {};
  list.mockReturnValueOnce(new Promise(resolve => { old = resolve; }));
  const first = useDMStore.getState().refresh('dev-a');
  list.mockResolvedValueOnce([{ id: 2, direction: 'out', read: true }]);
  await useDMStore.getState().refresh('dev-a');
  old([{ id: 1, direction: 'out', read: true }]);
  await first;
  expect(useDMStore.getState().messages.map(m => m.id)).toEqual([2]);
});
it('does not restore unread state from a request made before a local read', async () => {
  let resolve: (value: unknown) => void = () => {};
  useDMStore.setState({ messages: [{ id: 1, direction: 'in', read: false } as any] });
  list.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const refresh = useDMStore.getState().refresh('dev-a');
  useDMStore.getState().markRead('dev-a', 1);
  resolve([{ id: 1, direction: 'in', read: false }]);
  await refresh;
  expect(useDMStore.getState().messages[0].read).toBe(true);
});
