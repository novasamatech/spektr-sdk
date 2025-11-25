import type { TransportProvider } from '@novasamatech/host-api';

import { default as mitt } from 'mitt';

export function createProviders() {
  type Events = 'toHost' | 'toSdk';
  const bus = mitt<Record<Events, Uint8Array>>();

  function createProvider(listenTo: Events, postTo: Events): TransportProvider {
    return {
      isCorrectEnvironment: () => true,
      dispose: () => bus.off(listenTo),
      subscribe(callback) {
        bus.on(listenTo, callback);
        return () => bus.off(listenTo, callback);
      },
      postMessage(message) {
        bus.emit(postTo, message);
      },
    };
  }

  return {
    host: createProvider('toHost', 'toSdk'),
    sdk: createProvider('toSdk', 'toHost'),
  };
}
