import { ok } from '../../helpers/result.js';

import type { StorageAdapter } from './types.js';

export function createMemoryAdapter(external?: Record<string, string>): StorageAdapter {
  const storage: Record<string, string> = external ? { ...external } : {};

  return {
    async write(key, value) {
      storage[key] = value;
      return ok(undefined);
    },
    async read(key) {
      return ok(storage[key] ?? null);
    },
    async clear(key) {
      delete storage[key];
      return ok(undefined);
    },
  };
}
