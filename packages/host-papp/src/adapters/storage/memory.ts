import { createNanoEvents } from 'nanoevents';

import { ok } from '../../helpers/result.js';

import type { StorageAdapter } from './types.js';

export function createMemoryAdapter(external?: Record<string, string>): StorageAdapter {
  const events = createNanoEvents<Record<string, (value: string | null) => unknown>>();
  const storage: Record<string, string> = external ? { ...external } : {};

  return {
    async write(key, value) {
      storage[key] = value;
      events.emit(key, value);
      return ok(undefined);
    },
    async read(key) {
      return ok(storage[key] ?? null);
    },
    async clear(key) {
      delete storage[key];
      events.emit(key, null);
      return ok(undefined);
    },
    subscribe(key, callback) {
      return events.on(key, callback);
    },
  };
}
