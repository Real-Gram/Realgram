const mockOldState = JSON.stringify({ state: { deviceId: 'existing-account' }, version: 0 });
const mockStores = new Map<string, Map<string, string>>();
jest.mock('react-native', () => ({ NativeModules: { CallPush: { existingStorageNamespace: () => 'previous-v1' } } }));
jest.mock('react-native-mmkv', () => ({ MMKV: class {
  data: Map<string, string>;
  constructor({ id }: { id: string }) {
    if (!mockStores.has(id)) mockStores.set(id, new Map());
    this.data = mockStores.get(id)!;
  }
  getAllKeys() { return [...this.data.keys()]; }
  getString(key: string) { return this.data.get(key); }
  contains(key: string) { return this.data.has(key); }
  set(key: string, value: string) { this.data.set(key, value); }
  delete(key: string) { this.data.delete(key); }
} }));
import { syncGet } from '../storage/storage';
it('retains account state when source namespaces and persistence keys are renamed', () => {
  mockStores.set('previous-v1', new Map([['previous-auth-v1', mockOldState], ['unrelated-key', 'keep']]));
  expect(syncGet('realgram-auth-v1')).toBe(mockOldState);
  expect(syncGet('unrelated-key')).toBe('keep');
  expect(mockStores.get('previous-v1')?.get('previous-auth-v1')).toBe(mockOldState);
});
