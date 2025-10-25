import type { Transport } from '@novasamatech/spektr-sdk-transport';

import { defaultTransport } from './transport';

export function createSpektrMetaProvider(transport: Transport = defaultTransport) {
  if (transport.isCorrectEnvironment()) {
    const getUrl = () => {
      return window.location.pathname + window.location.hash + window.location.search;
    };

    window.addEventListener('hashchange', () => {
      transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
    });

    window.addEventListener('popstate', () => {
      transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
    });

    transport.postMessage('_', { tag: 'locationChangedV1', value: getUrl() });
  }

  return {
    getTheme(): Promise<'dark' | 'light'> {
      return Promise.resolve('light');
    },
  };
}

export const spektrMetaProvider = createSpektrMetaProvider();
