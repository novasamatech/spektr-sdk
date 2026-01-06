import type { ConnectionStatus, Transport } from '@novasamatech/host-api';

import { defaultTransport } from './defaultTransport.js';

export function createMetaProvider(transport: Transport = defaultTransport) {
  // if (transport.isCorrectEnvironment() && typeof window !== 'undefined') {
  //   const getUrl = () => {
  //     return window.location.pathname + window.location.hash + window.location.search;
  //   };
  //
  //   window.addEventListener('hashchange', () => {
  //     transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
  //   });
  //
  //   window.addEventListener('popstate', () => {
  //     transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
  //   });
  //
  //   transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
  // }

  return {
    subscribeConnectionStatus(callback: (connectionStatus: ConnectionStatus) => void) {
      return transport.onConnectionStatusChange(callback);
    },
  };
}

export const metaProvider = createMetaProvider();
