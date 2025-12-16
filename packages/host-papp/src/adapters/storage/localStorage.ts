import { createNanoEvents } from 'nanoevents';
import { fromAsyncThrowable } from 'neverthrow';

import { toError } from '../../helpers/utils.js';

import type { StorageAdapter } from './types.js';

export function createLocalStorageAdapter(prefix: string): StorageAdapter {
  const events = createNanoEvents<Record<string, (value: string | null) => unknown>>();
  const withPrefix = (key: string) => `PAPP_${prefix}_${key}`;

  return {
    write: fromAsyncThrowable(async (key, value) => {
      localStorage.setItem(withPrefix(key), value);
      events.emit(key, value);
    }, toError),
    read: fromAsyncThrowable(async key => {
      return localStorage.getItem(withPrefix(key));
    }, toError),
    clear: fromAsyncThrowable(async key => {
      localStorage.removeItem(withPrefix(key));
      events.emit(key, null);
    }, toError),
    subscribe(key, callback) {
      const prefixedKey = withPrefix(key);
      const unsubscribeLocalListener = events.on(prefixedKey, callback);

      const externalListener = (event: StorageEvent) => {
        if (event.storageArea === localStorage && event.key === prefixedKey) {
          callback(event.newValue);
        }
      };

      window.addEventListener('storage', externalListener);

      return () => {
        unsubscribeLocalListener();
        window.removeEventListener('storage', externalListener);
      };
    },
  };
}
