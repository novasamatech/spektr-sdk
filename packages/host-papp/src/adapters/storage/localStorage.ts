import { ok } from '../../helpers/result.js';

import type { StorageAdapter } from './types.js';

export function createLocalStorageAdapter(prefix: string): StorageAdapter {
  const withPrefix = (key: string) => `PAPP_${prefix}_${key}`;

  return {
    async write(key, value) {
      localStorage.setItem(withPrefix(key), value);
      return ok(undefined);
    },
    async read(key) {
      return ok(localStorage.getItem(withPrefix(key)));
    },
    async clear(key) {
      localStorage.removeItem(withPrefix(key));
      return ok(undefined);
    },
  };
}
