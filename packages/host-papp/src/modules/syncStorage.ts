import { createNanoEvents } from 'nanoevents';

export function createSyncStorage<T>(initial: T) {
  const events = createNanoEvents<{ value: (value: T) => void }>();

  let value: T = initial;

  events.on('value', v => {
    value = v;
  });

  return {
    read() {
      return value;
    },
    write(value: T) {
      events.emit('value', value);
    },
    reset() {
      events.emit('value', initial);
    },
    subscribe(fn: (value: T) => void) {
      return events.on('value', fn);
    },
  };
}
