import { createNanoEvents } from 'nanoevents';

import type { StorageAdapter } from '../adapters/storage/types.js';
import { ok } from '../helpers/result.js';

export function createSyncStorage<T>(initial: T) {
  const events = createNanoEvents<{
    value: (value: T) => void;
    first: () => void;
    last: () => void;
  }>();

  let touched = false;
  let currentValue: T = initial;

  return {
    touched() {
      return touched;
    },
    read() {
      return currentValue;
    },
    write(value: T): T {
      if (currentValue !== value) {
        touched = true;
        currentValue = value;
        events.emit('value', value);
      }
      return value;
    },
    reset() {
      touched = true;
      currentValue = initial;
      events.emit('value', initial);
    },
    subscribe(fn: (value: T) => void) {
      if (!events.events.value || events.events.value.length === 0) {
        events.emit('first');
      }

      const unsubscribe = events.on('value', fn);

      return () => {
        unsubscribe();
        if (!events.events.value || events.events.value.length === 0) {
          events.emit('last');
        }
      };
    },
    onFirstSubscribe(callback: VoidFunction) {
      return events.on('first', callback);
    },
    onLastUnsubscribe(callback: VoidFunction) {
      return events.on('last', callback);
    },
  };
}

type ReactiveStorageParams<T> = {
  storage: StorageAdapter;
  key: string;
  initial: T;
  autosync: boolean;
  from(value: string): T;
  to(value: T): string | null;
};

export function reactiveStorage<T>({ storage, initial, key, autosync, from, to }: ReactiveStorageParams<T>) {
  const sync = createSyncStorage<T>(initial);

  const enhancedStorage = {
    async read() {
      const result = await storage.read(key);
      return result.map(x => sync.write(x === null ? initial : from(x)));
    },

    async write(value: T) {
      const data = to(value);

      if (data !== null) {
        const result = await storage.write(key, data);
        return result.map(() => sync.write(value));
      }

      return ok<null, Error>(null);
    },

    async clear() {
      const result = await storage.clear(key);
      return result.map(() => sync.reset());
    },

    subscribe(fn: (value: T | null) => void) {
      return sync.subscribe(fn);
    },
  };

  if (autosync) {
    sync.onFirstSubscribe(() => enhancedStorage.read());
  }

  return enhancedStorage;
}
