import type { SignerPayloadRaw, SignerPayloadJSON, SignerResult } from '@polkadot/types/types';
import type { JsonRpcConnection, JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { type HexString, isValidMessage } from '@novasamatech/spektr-sdk-shared';
import {
  type InjectedAccountSchema,
  type TransportProvider,
  createTransport,
} from '@novasamatech/spektr-sdk-transport';

function hasWindow() {
  try {
    return typeof window !== 'undefined';
  } catch {
    return false;
  }
}

function formatError(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
}

export function createIframeProvider(iframe: HTMLIFrameElement, url: string): TransportProvider {
  iframe.src = url;

  let disposed = false;
  let iframePromise: Promise<Window | null> | null = null;
  const subscribers = new Set<(message: Uint8Array) => void>();

  function waitForIframe(callback: (iframe: Window | null) => void) {
    if (iframe.contentWindow) {
      return callback(iframe.contentWindow);
    }

    if (iframePromise) {
      iframePromise.then(callback);
      return;
    }

    iframePromise = new Promise<Window | null>(resolve => {
      iframe.addEventListener(
        'load',
        () => {
          resolve(iframe.contentWindow ?? null);
          callback(iframe.contentWindow ?? null);
          iframePromise = null;
        },
        { once: true },
      );
    });
  }

  const messageHandler = (event: MessageEvent) => {
    if (disposed) return;
    waitForIframe(iframe => {
      if (disposed) return;
      if (!iframe) return;
      if (!isValidMessage(event, iframe, window)) return;

      for (const subscriber of subscribers) {
        subscriber(event.data);
      }
    });
  };

  if (hasWindow()) {
    window.addEventListener('message', messageHandler);
  }

  return {
    isCorrectEnvironment() {
      return hasWindow();
    },
    postMessage(message) {
      if (disposed) return;

      waitForIframe(iframe => {
        if (!iframe) return;
        if (disposed) return;

        iframe.postMessage(message, '*', [message.buffer]);
      });
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    dispose() {
      disposed = true;
      iframe.src = '';
      iframePromise = null;
      subscribers.clear();

      if (hasWindow()) {
        window.removeEventListener('message', messageHandler);
      }
    },
  };
}

export type Container = ReturnType<typeof createContainer>;

export function createContainer(provider: TransportProvider) {
  const transport = createTransport(provider);
  const papiSubscribers = new Set<VoidFunction>();

  return {
    connectToPapiProvider(chainId: HexString, provider: JsonRpcProvider) {
      let connection: JsonRpcConnection | null = null;

      return transport?.handleMessage('papiProviderSendMessageV1', async message => {
        if (!connection) {
          connection = provider(message => {
            transport.postMessage('_', {
              tag: 'papiProviderReceiveMessageV1',
              value: { tag: 'success', value: { chainId, message } },
            });
          });
        }

        if (message.chainId === chainId) {
          connection.send(message.message);
        }
      });
    },

    handleAccounts({
      get,
      subscribe,
    }: {
      get: () => Promise<InjectedAccountSchema[]>;
      subscribe: (callback: (accounts: InjectedAccountSchema[]) => void) => () => void;
    }) {
      transport?.handleMessage<'getAccountsRequestV1', 'getAccountsResponseV1'>('getAccountsRequestV1', async () => {
        try {
          const accounts = await get();

          return {
            tag: 'getAccountsResponseV1',
            value: { tag: 'success', value: accounts },
          };
        } catch (e) {
          return {
            tag: 'getAccountsResponseV1',
            value: { tag: 'error', value: formatError(e) },
          };
        }
      });

      papiSubscribers.add(
        subscribe(accounts => {
          transport?.postMessage('_', { tag: 'getAccountsResponseV1', value: { tag: 'success', value: accounts } });
        }),
      );
    },

    handleSignRequest({
      signRaw,
      signPayload,
    }: {
      signRaw: (raw: SignerPayloadRaw) => Promise<SignerResult>;
      signPayload: (payload: SignerPayloadJSON) => Promise<SignerResult>;
    }) {
      transport?.handleMessage<'signRawRequestV1', 'signResponseV1'>('signRawRequestV1', async message => {
        try {
          const result = await signRaw(message);
          return {
            tag: 'signResponseV1',
            value: { tag: 'success', value: result },
          };
        } catch (e) {
          return {
            tag: 'signResponseV1',
            value: { tag: 'error', value: formatError(e) },
          };
        }
      });

      transport?.handleMessage<'signPayloadRequestV1', 'signResponseV1'>('signPayloadRequestV1', async message => {
        try {
          const result = await signPayload(message);
          return {
            tag: 'signResponseV1',
            value: { tag: 'success', value: result },
          };
        } catch (e) {
          return {
            tag: 'signResponseV1',
            value: { tag: 'error', value: formatError(e) },
          };
        }
      });
    },

    handleLocationChange(callback: (location: string) => void) {
      transport?.handleMessage('locationChangedV1', async location => {
        callback(location);
      });
    },

    handleChainSupportCheck(callback: (chainId: HexString) => boolean) {
      transport?.handleMessage<'supportFeatureRequestV1', 'supportFeatureResponseV1'>(
        'supportFeatureRequestV1',
        async message => {
          if (message.tag === 'chain') {
            try {
              const result = callback(message.value.chainId);
              return {
                tag: 'supportFeatureResponseV1',
                value: {
                  tag: 'success',
                  value: { tag: 'chain', value: { chainId: message.value.chainId, result } },
                },
              };
            } catch (e) {
              return {
                tag: 'supportFeatureResponseV1',
                value: { tag: 'error', value: formatError(e) },
              };
            }
          }
        },
      );
    },

    dispose() {
      transport?.dispose();
      papiSubscribers.forEach(callback => callback());
      papiSubscribers.clear();
    },
  };
}
