import { createNanoEvents } from 'nanoevents';
import { fromAsyncThrowable } from 'neverthrow';

import type { StorageAdapter } from './types.js';

export function createMemoryAdapter(external?: Record<string, string>): StorageAdapter {
  const events = createNanoEvents<Record<string, (value: string | null) => unknown>>();
  const storage: Record<string, string> = external ? { ...external } : {};

  return {
    write: fromAsyncThrowable(async (key, value) => {
      storage[key] = value;
      events.emit(key, value);
    }),
    read: fromAsyncThrowable(async key => {
      return storage[key] ?? null;
    }),
    clear: fromAsyncThrowable(async key => {
      delete storage[key];
      events.emit(key, null);
    }),
    subscribe(key, callback) {
      return events.on(key, callback);
    },
  };
}
