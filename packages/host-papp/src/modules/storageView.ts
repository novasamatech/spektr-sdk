import type { StorageAdapter } from '../adapters/storage/types.js';
import { ok } from '../helpers/result.js';
import { nonNullable } from '../helpers/utils.js';

import { createState } from './state.js';

type Params<T> = {
  storage: StorageAdapter;
  key: string;
  initial: T;
  autosync: boolean;
  from(value: string): T;
  to(value: T): string | null;
};

export function storageView<T>({ storage, initial, key, autosync, from, to }: Params<T>) {
  const state = createState<string | null>(to(initial));

  const enhancedStorage = {
    async read() {
      const result = await storage.read(key);
      return result.map(state.write).map(x => (nonNullable(x) ? from(x) : initial));
    },

    async write(value: T) {
      const data = to(value);

      if (data !== null) {
        const result = await storage.write(key, data);
        return result.map(() => state.write(data)).map(() => value);
      }

      return ok<null, Error>(null);
    },

    async clear() {
      const result = await storage.clear(key);
      return result.map(() => state.reset());
    },

    subscribe(fn: (value: T | null) => void) {
      return state.subscribe(x => fn(nonNullable(x) ? from(x) : null));
    },
  };

  if (autosync) {
    enhancedStorage.read();
  }

  state.onFirstSubscribe(() => enhancedStorage.read());

  return enhancedStorage;
}
