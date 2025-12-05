import type { StorageAdapter } from './types.js';

export function createLocalStorageAdapter(prefix: string): StorageAdapter {
  const withPrefix = (key: string) => `PAPP_${prefix}_${key}`;

  return {
    async write(key, value) {
      localStorage.setItem(withPrefix(key), value);
      return true;
    },
    async read(key) {
      return localStorage.getItem(withPrefix(key));
    },
  };
}
