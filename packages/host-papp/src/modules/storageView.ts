import type { ResultAsync } from 'neverthrow';
import { okAsync } from 'neverthrow';

import type { StorageAdapter } from '../adapters/storage/types.js';
import { nonNullable } from '../helpers/utils.js';

import { createState } from './state.js';

type Params<T> = {
  storage: StorageAdapter;
  key: string;
  initial: T;
  autosync?: boolean;
  from(value: string): T;
  to(value: T): string | null;
};

export function storageView<T>({ storage, initial, key, from, to, autosync = true }: Params<T>) {
  const state = createState<string | null>(to(initial));

  const enhancedStorage = {
    read() {
      return storage
        .read(key)
        .map(state.write)
        .map(x => (nonNullable(x) ? from(x) : initial));
    },

    write(value: T) {
      const data = to(value);

      if (data !== null) {
        return storage
          .write(key, data)
          .map(() => state.write(data))
          .map(() => value);
      }

      return okAsync<null, Error>(null);
    },

    clear() {
      return storage.clear(key).map(() => state.reset());
    },

    subscribe(fn: (value: T) => void) {
      return state.subscribe(x => fn(nonNullable(x) ? from(x) : initial));
    },
  };

  if (autosync) {
    enhancedStorage.read();
  }

  state.onFirstSubscribe(() => enhancedStorage.read());

  return enhancedStorage;
}

export function storageListView<T>(params: Params<T[]>) {
  const view = storageView(params);

  const listView = {
    ...view,

    add(value: T): ResultAsync<T, Error> {
      return listView.mutate(list => list.concat(value)).map(() => value);
    },

    mutate(fn: (value: T[]) => T[]): ResultAsync<T[], Error> {
      return listView.read().andThen(list => {
        const result = fn(list);
        return listView.write(result).map(() => result);
      });
    },
  };

  return listView;
}
