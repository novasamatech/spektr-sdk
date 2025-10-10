import type { JsonRpcConnection, JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { type HexString, isValidMessage } from '@spektr/sdk-shared';
import {
  type InjectedAccountSchema,
  messageEncoder,
  type MessagePayloadSchema,
  type MessageType,
  type PickMessagePayload,
} from '@spektr/sdk-transport';

export function createContainer(url: string) {
  const iframe = document.createElement('iframe');
  iframe.src = url;

  const listeners = new Set<(message: MessageEvent) => void>();
  const disposeSubscribers = new Set<VoidFunction>();
  let disposed = false;

  function waitForIframe(callback: (iframe: Window | null) => void) {
    if (iframe.contentWindow) {
      return callback(iframe.contentWindow);
    }

    iframe.addEventListener(
      'load',
      () => {
        callback(iframe.contentWindow ?? null);
      },
      { once: true },
    );
  }

  function postMessage(id: string, payload: MessagePayloadSchema) {
    waitForIframe(iframe => {
      if (disposed || !iframe) return;

      const encoded = messageEncoder.enc({ id, payload });
      iframe.postMessage(encoded, '*', [encoded.buffer]);
    });
  }

  function handleMessage<Request extends MessageType, Response extends MessageType>(
    type: Request,
    handler: (message: PickMessagePayload<Request>['value']) => Promise<PickMessagePayload<Response> | void>,
  ) {
    if (disposed) return;

    const messageHandler = (event: MessageEvent) => {
      waitForIframe(iframe => {
        if (!iframe) return;
        if (!isValidMessage(event, iframe, window)) return;

        let message;
        try {
          message = messageEncoder.dec(event.data.buffer);
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
    };

    window.addEventListener('message', messageHandler);

    listeners.add(messageHandler);
  }

  handleMessage<'handshakeRequestV1', 'handshakeResponseV1'>('handshakeRequestV1', async () => ({
    tag: 'handshakeResponseV1',
    value: {
      tag: 'success',
      value: undefined,
    },
  }));

  const api = {
    iframe,

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
            tag: 'getAccountsResponseV1' as const,
            value: {
              tag: 'success' as const,
              value: accounts,
            },
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';

          return {
            tag: 'getAccountsResponseV1' as const,
            value: {
              tag: 'error' as const,
              value: message,
            },
          };
        }
      });

      disposeSubscribers.add(
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
      disposeSubscribers.forEach(callback => callback());
      listeners.forEach(listener => {
        iframe.contentWindow?.removeEventListener('message', listener);
      });

      disposeSubscribers.clear();
      listeners.clear();
    },
  };

  return api;
}
