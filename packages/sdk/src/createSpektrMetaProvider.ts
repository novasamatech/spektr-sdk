import { defaultTransport, type Transport } from './createTransport';
import { inIframe } from './utils';

export function createSpektrMetaProvider(transport: Transport | null = defaultTransport) {
  if (transport && inIframe()) {
    const getUrl = () => {
      return window.location.pathname + window.location.hash + window.location.search;
    };

    window.addEventListener('hashchange', () => {
      transport?.send('_', { tag: 'locationChangedV1', value: getUrl() });
    });

    window.addEventListener('popstate', () => {
      transport?.send('_', { tag: 'locationChangedV1', value: getUrl() });
    });

    transport?.send('_', { tag: 'locationChangedV1', value: getUrl() });
  }

  return {
    getTheme(): Promise<'dark' | 'light'> {
      return Promise.resolve('light');
    },
    getChains(): Promise<unknown[]> {
      return Promise.resolve([]);
    },
  };
}

export const spektrMetaProvider = createSpektrMetaProvider();
