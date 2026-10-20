import { NativeModules } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

// Lazily initialized MMKV-backed storage adapter for zustand persist.
// Falls back to a synchronous in-memory Map when react-native-mmkv native
// module is not linked (Jest, pre-build dev, Storybook).
// Swap: once the Android native module is linked, MMKV is used automatically.

let _storage: StateStorage | null = null;

function resolve(): StateStorage {
  if (_storage) return _storage;

  try {
    // Dynamic require so the import doesn't throw at module parse time
    // in environments without the native module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv');
    const mmkv = new MMKV({ id: 'realgram-v1' });
    // Discover the previous app storage by its native file, then migrate only
    // string state into the canonical namespace. Existing accounts survive an
    // update without keeping the retired product name in current source.
    const previousId = NativeModules.CallPush?.existingStorageNamespace?.();
    if (previousId && previousId !== 'realgram-v1') {
      const previous = new MMKV({ id: previousId });
      for (const key of previous.getAllKeys()) {
        const previousPrefix = previousId.replace(/-v1$/, '') + '-';
        const canonical = key.startsWith(previousPrefix) ? 'realgram-' + key.slice(previousPrefix.length) : key;
        try {
          const value = previous.getString(key);
          if (value !== undefined && !mmkv.contains(canonical)) mmkv.set(canonical, value);
        } catch { /* Non-string values are outside the Zustand state adapter. */ }
      }
    }
    _storage = {
      getItem:    (key) => mmkv.getString(key) ?? null,
      setItem:    (key, value) => mmkv.set(key, value),
      removeItem: (key) => mmkv.delete(key),
    };
  } catch {
    const map = new Map<string, string>();
    _storage = {
      getItem:    (key) => map.get(key) ?? null,
      setItem:    (key, value) => { map.set(key, value); },
      removeItem: (key) => { map.delete(key); },
    };
  }

  return _storage;
}

export const storage: StateStorage = {
  getItem:    (key) => resolve().getItem(key),
  setItem:    (key, value) => resolve().setItem(key, value),
  removeItem: (key) => resolve().removeItem(key),
};

/** Synchronous getItem — safe because both MMKV and the fallback Map are sync. */
export function syncGet(key: string): string | null {
  return storage.getItem(key) as string | null;
}
