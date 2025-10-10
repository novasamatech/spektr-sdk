import type { JsonRpcConnection, JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { type HexString, isValidMessage } from '@novasamatech/spektr-sdk-shared';
import {
  type InjectedAccountSchema,
  messageEncoder,
  type MessagePayloadSchema,
  type MessageType,
  type PickMessagePayload,
} from '@novasamatech/spektr-sdk-transport';

type DappProvider = {
  postMessage(message: Uint8Array): void;
  handleMessage(callback: (message: Uint8Array) => void): VoidFunction;
  dispose(): void;
};

export function createIframeProvider(iframe: HTMLIFrameElement, url: string): DappProvider {
  iframe.src = url;

  let disposed = false;
  let iframePromise: Promise<Window | null> | null = null;
  const subscribers = new Set<VoidFunction>();

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

  return {
    postMessage(message) {
      if (disposed) return;
      waitForIframe(iframe => {
        if (!iframe) return;
        if (disposed) return;

        iframe.postMessage(message, '*', [message.buffer]);
      });
    },
    handleMessage(callback) {
      const messageHandler = (event: MessageEvent) => {
        if (disposed) return;
        waitForIframe(iframe => {
          if (disposed) return;
          if (!iframe) return;
          if (!isValidMessage(event, iframe, window)) return;

          callback(event.data);
        });
      };

      window.addEventListener('message', messageHandler);

      const unsubscribe = () => {
        window.removeEventListener('message', messageHandler);
      };

      subscribers.add(unsubscribe);
      return unsubscribe;
    },
    dispose() {
      disposed = true;
      iframe.src = '';
      iframePromise = null;
      subscribers.forEach(callback => callback());
      subscribers.clear();
    },
  };
}

export function createContainer(provider: DappProvider) {
  const papiSubscribers = new Set<VoidFunction>();
  let disposed = false;

  function postMessage(id: string, payload: MessagePayloadSchema) {
    if (disposed) return;

    const encoded = messageEncoder.enc({ id, payload });
    provider.postMessage(encoded);
  }

  function handleMessage<Request extends MessageType, Response extends MessageType>(
    type: Request,
    handler: (message: PickMessagePayload<Request>['value']) => Promise<PickMessagePayload<Response> | void>,
  ) {
    if (disposed) return;

    return provider.handleMessage(data => {
      let message;
      try {
        // @ts-expect-error Somehow buffer is required here
        message = messageEncoder.dec(data.buffer);
      } catch (e) {
        console.error(e);
        return;
      }

      if (message.payload.tag == type) {
        handler(message.payload.value as PickMessagePayload<Request>['value']).then(result => {
          if (!result) return;

          postMessage(message.id, result);
        });
      }
    });
  }

  handleMessage<'handshakeRequestV1', 'handshakeResponseV1'>('handshakeRequestV1', async () => ({
    tag: 'handshakeResponseV1',
    value: {
      tag: 'success',
      value: undefined,
    },
  }));

  const api = {
    connectToPapiProvider(chainId: HexString, provider: JsonRpcProvider) {
      let connection: JsonRpcConnection | null = null;

      return handleMessage('papiProviderSendMessageV1', async message => {
        if (!connection) {
          connection = provider(message => {
            postMessage('_', {
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
      handleMessage<'getAccountsRequestV1', 'getAccountsResponseV1'>('getAccountsRequestV1', async () => {
        try {
          const accounts = await get();

          return {
            tag: 'getAccountsResponseV1',
            value: {
              tag: 'success',
              value: accounts,
            },
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';

          return {
            tag: 'getAccountsResponseV1',
            value: {
              tag: 'error',
              value: message,
            },
          };
        }
      });

      papiSubscribers.add(
        subscribe(accounts => {
          postMessage('_', { tag: 'getAccountsResponseV1', value: { tag: 'success', value: accounts } });
        }),
      );
    },

    handleSignRequest(callback: (payload: any) => Promise<string | undefined>) {
      callback({});
      // TODO implement
    },

    dispose() {
      disposed = true;
      provider.dispose();
      papiSubscribers.forEach(callback => callback());
      papiSubscribers.clear();
    },
  };

  return api;
}
