import { HANDSHAKE_INTERVAL, promiseWithResolvers } from '@novasamatech/spektr-sdk-shared';
import { nanoid } from 'nanoid';

import type { MessagePayloadSchema, MessageType, PickMessagePayload, PickMessagePayloadValue } from './messageEncoder';
import { messageEncoder } from './messageEncoder';

export type TransportProvider = {
  isCorrectEnvironment(): boolean;
  postMessage(message: Uint8Array): void;
  subscribe(callback: (message: Uint8Array) => void): () => void;
  dispose(): void;
};

export type Transport = {
  isCorrectEnvironment(): boolean;

  isReady(): Promise<boolean>;

  subscribeAny(callback: (id: string, payload: MessagePayloadSchema) => void): VoidFunction;

  subscribe<const Type extends MessageType>(
    type: Type,
    callback: (id: string, payload: PickMessagePayloadValue<Type>) => void,
  ): VoidFunction;

  postMessage(id: string, payload: MessagePayloadSchema): string;

  request<Response extends MessageType>(
    payload: MessagePayloadSchema,
    response: Response,
    abortSignal?: AbortSignal,
  ): Promise<PickMessagePayloadValue<Response>>;

  handleMessage<Request extends MessageType, Response extends MessageType>(
    type: Request,
    handler: (message: PickMessagePayloadValue<Request>) => Promise<PickMessagePayload<Response> | void>,
  ): VoidFunction;

  dispose(): void;
};

type TransportParams = Partial<{
  handshakeTimeout: number;
}>;

export function createTransport(provider: TransportProvider, params?: TransportParams): Transport {
  const handshakeTimeout = params?.handshakeTimeout ?? Number.POSITIVE_INFINITY;

  const handshakeAbortController = new AbortController();
  let handshakePromise: Promise<boolean> | null = null;
  let connected: boolean | null = null;
  let disposed = false;

  function throwIfDisposed() {
    if (disposed) {
      throw new Error('Transport is disposed');
    }
  }

  function throwIfIncorrectEnvironment() {
    if (!provider.isCorrectEnvironment()) {
      throw new Error('Environment is not correct');
    }
  }

  const transportInstance: Transport = {
    isCorrectEnvironment() {
      return provider.isCorrectEnvironment();
    },

    isReady() {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      if (connected !== null) {
        return Promise.resolve(connected);
      }

      if (handshakePromise) {
        return handshakePromise;
      }

      let resolved = false;

      const request = new Promise<boolean>(resolve => {
        const id = nanoid();

        const interval = setInterval(() => {
          if (handshakeAbortController.signal.aborted) {
            clearInterval(interval);
            resolve(false);
            return;
          }

          transportInstance.postMessage(id, { tag: 'handshakeRequestV1', value: undefined });
        }, HANDSHAKE_INTERVAL);

        const unsubscribe = transportInstance.subscribe('handshakeResponseV1', responseId => {
          if (responseId !== id) return;
          clearInterval(interval);
          unsubscribe();
          handshakeAbortController.signal.removeEventListener('abort', unsubscribe);
          resolved = true;
          resolve(true);
        });

        handshakeAbortController.signal.addEventListener('abort', unsubscribe, { once: true });
      });

      handshakePromise =
        handshakeTimeout === Number.POSITIVE_INFINITY
          ? request
          : Promise.race([
              request,
              new Promise<boolean>(resolve => {
                setTimeout(() => {
                  if (!resolved) {
                    handshakeAbortController.abort('Timeout');
                    resolve(false);
                  }
                }, handshakeTimeout);
              }),
            ]);

      handshakePromise.then(result => {
        handshakePromise = null;
        connected = result;
        return result;
      });

      return handshakePromise;
    },

    subscribeAny(callback) {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      return provider.subscribe(message => {
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
      callback: (id: string, payload: PickMessagePayloadValue<Type>) => void,
    ) {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      return transportInstance.subscribeAny((id, message) => {
        if (message.tag == type) {
          callback(id, message.value as PickMessagePayloadValue<Type>);
        }
      });
    },

    postMessage(id, payload) {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      const encoded = messageEncoder.enc({ id, payload });
      provider.postMessage(encoded);
      return id;
    },

    async request<Response extends MessageType>(
      payload: MessagePayloadSchema,
      response: Response,
      abortSignal?: AbortSignal,
    ) {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      const ready = await transportInstance.isReady();
      if (!ready) {
        throw new Error('Spektr is not ready');
      }

      abortSignal?.throwIfAborted();

      const requestId = nanoid();
      const { resolve, reject, promise } = promiseWithResolvers<PickMessagePayloadValue<Response>>();

      const unsubscribe = transportInstance.subscribe(response, (receivedId, payload) => {
        if (receivedId === requestId) {
          abortSignal?.removeEventListener('abort', stop);
          unsubscribe();
          resolve(payload as PickMessagePayloadValue<Response>);
        }
      });

      const stop = () => {
        unsubscribe();
        reject(abortSignal?.reason ?? new Error('Request aborted'));
      };

      abortSignal?.addEventListener('abort', stop, { once: true });

      transportInstance.postMessage(requestId, payload);

      return promise;
    },

    handleMessage<Request extends MessageType, Response extends MessageType>(
      type: Request,
      handler: (message: PickMessagePayloadValue<Request>) => Promise<PickMessagePayload<Response> | void>,
    ) {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      return transportInstance.subscribe(type, (id, payload) => {
        handler(payload).then(result => {
          if (!result) return;
          transportInstance.postMessage(id, result);
        });
      });
    },

    dispose() {
      disposed = true;
      provider.dispose();
      handshakeAbortController.abort('Transport disposed');
    },
  };

  if (provider.isCorrectEnvironment()) {
    transportInstance.handleMessage<'handshakeRequestV1', 'handshakeResponseV1'>('handshakeRequestV1', async () => ({
      tag: 'handshakeResponseV1',
      value: {
        tag: 'success',
        value: undefined,
      },
    }));
  }

  return transportInstance;
}
