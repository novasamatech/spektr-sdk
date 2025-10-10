import { HANDSHAKE_INTERVAL, isValidMessage, promiseWithResolvers } from '@novasamatech/spektr-sdk-shared';
import {
  messageEncoder,
  type MessagePayloadSchema,
  type MessageType,
  type PickMessagePayload,
} from '@novasamatech/spektr-sdk-transport';
import { nanoid } from 'nanoid';
import { getParentWindow, inIframe } from './utils';

export type Provider = {
  send(message: Uint8Array): void;
  on(callback: (message: Uint8Array) => void): () => void;
};

export const defaultProvider: Provider = {
  send(message) {
    getParentWindow().postMessage(message, '*', [message.buffer]);
  },
  on(callback) {
    const handle = (event: MessageEvent) => {
      if (!isValidMessage(event, getParentWindow(), window)) return;

      callback(event.data);
    };

    window.addEventListener('message', handle);

    return () => {
      window.removeEventListener('message', handle);
    };
  },
};

export type Transport = NonNullable<ReturnType<typeof createTransport>>;

export function createTransport(provider: Provider = defaultProvider) {
  if (!inIframe()) {
    return null;
  }

  const readyAbortController = new AbortController();
  const connected: boolean | null = null;

  const api = {
    isSpektrReady(): Promise<boolean> {
      if (connected !== null) {
        return Promise.resolve(connected);
      }

      const request = new Promise<boolean>(resolve => {
        const interval = setInterval(() => {
          if (readyAbortController.signal.aborted) {
            clearInterval(interval);
            resolve(false);
            return;
          }

          const id = nanoid();
          const encoded = messageEncoder.enc({ id, payload: { tag: 'handshakeRequestV1', value: undefined } });

          const unsubscribe = api.subscribe('handshakeResponseV1', receivedId => {
            if (receivedId !== id) return;
            clearInterval(interval);
            unsubscribe();
            resolve(true);
          });

          provider.send(encoded);
        }, HANDSHAKE_INTERVAL);
      });

      return Promise.race([
        request,
        new Promise<boolean>(resolve => {
          setTimeout(() => {
            readyAbortController.abort();
            resolve(false);
          }, 1_000);
        }),
      ]);
    },

    subscribeAny(callback: (id: string, payload: MessagePayloadSchema) => void) {
      return provider.on(message => {
        let result;
        try {
          result = messageEncoder.dec(message);
        } catch {
          return;
        }

        callback(result.id, result.payload);
      });
    },

    subscribe<const Type extends MessageType>(
      type: Type,
      callback: (id: string, payload: PickMessagePayload<Type>) => void,
    ) {
      return api.subscribeAny((id, message) => {
        if (message.tag == type) {
          callback(id, message as PickMessagePayload<Type>);
        }
      });
    },

    send(id: string, payload: MessagePayloadSchema): string {
      const encoded = messageEncoder.enc({ id, payload });
      provider.send(encoded);
      return id;
    },

    async request(payload: MessagePayloadSchema): Promise<MessagePayloadSchema> {
      const ready = await api.isSpektrReady();
      if (!ready) {
        throw new Error('Spektr is not ready');
      }

      const id = nanoid();
      const { resolve, promise } = promiseWithResolvers<MessagePayloadSchema>();

      const unsubscribe = api.subscribeAny((receivedId, message) => {
        if (receivedId === id) {
          unsubscribe();
          resolve(message);
        }
      });

      api.send(id, payload);

      return promise;
    },
  };

  return api;
}
