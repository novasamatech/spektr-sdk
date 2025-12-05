import type { StorageAdapter } from './types.js';

export function createMemoryAdapter(external?: Record<string, string>): StorageAdapter {
  const storage: Record<string, string> = external ? { ...external } : {};

  return {
    async write(key, value) {
      storage[key] = value;
      return true;
    },
    async read(key) {
      return storage[key] ?? null;
    },
  };
}
