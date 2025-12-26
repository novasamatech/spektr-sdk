import { createNanoEvents } from 'nanoevents';

type State<T> = ReturnType<typeof createState<T>>;

export function createState<T>(initial: T) {
  const events = createNanoEvents<{
    value: (value: T) => void;
    first: () => void;
    last: () => void;
  }>();

  let currentValue: T = initial;

  return {
    read() {
      return currentValue;
    },
    write(value: T | ((prev: T) => T)): T {
      const actialValue = typeof value === 'function' ? (value as (prev: T) => T)(currentValue) : value;

      if (currentValue !== actialValue) {
        currentValue = actialValue;
        events.emit('value', actialValue);
      }
      return actialValue;
    },
    reset() {
      if (currentValue !== initial) {
        currentValue = initial;
        events.emit('value', initial);
      }
    },
    subscribe(fn: (value: T) => void) {
      if (!events.events.value || events.events.value.length === 0) {
        events.emit('first');
      }

      const unsubscribe = events.on('value', fn);
      fn(currentValue);

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

export function readonly<T>(state: State<T>) {
  return {
    read: state.read,
    subscribe: state.subscribe,
    onFirstSubscribe: state.onFirstSubscribe,
    onLastUnsubscribe: state.onLastUnsubscribe,
  };
}
