import { createNanoEvents } from 'nanoevents';

import { err, ok } from '../../helpers/result.js';
import { toError } from '../../helpers/utils.js';

import type { StorageAdapter } from './types.js';

export function createLocalStorageAdapter(prefix: string): StorageAdapter {
  const events = createNanoEvents<Record<string, (value: string | null) => unknown>>();
  const withPrefix = (key: string) => `PAPP_${prefix}_${key}`;

  return {
    async write(key, value) {
      try {
        localStorage.setItem(withPrefix(key), value);
        events.emit(key, value);
        return ok(undefined);
      } catch (e) {
        return err(toError(e));
      }
    },
    async read(key) {
      try {
        return ok(localStorage.getItem(withPrefix(key)));
      } catch (e) {
        return err(toError(e));
      }
    },
    async clear(key) {
      try {
        localStorage.removeItem(withPrefix(key));
        events.emit(key, null);
        return ok(undefined);
      } catch (e) {
        return err(toError(e));
      }
    },
    subscribe(key, callback) {
      return events.on(withPrefix(key), callback);
    },
  };
}
