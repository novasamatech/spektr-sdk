import mitt from 'mitt';
import { nanoid } from 'nanoid';

import { HANDSHAKE_INTERVAL } from './constants';
import { delay, promiseWithResolvers } from './helpers';
import type { MessagePayloadSchema, MessageType, PickMessagePayload, PickMessagePayloadValue } from './messageEncoder';
import { messageEncoder } from './messageEncoder';
import type { ConnectionStatus, Transport, TransportProvider } from './types';

type TransportParams = Partial<{
  handshakeTimeout: number;
}>;

export function createTransport(provider: TransportProvider, params?: TransportParams): Transport {
  const handshakeTimeout = params?.handshakeTimeout ?? Number.POSITIVE_INFINITY;

  const handshakeAbortController = new AbortController();

  let handshakePromise: Promise<boolean> | null = null;
  let connectionStatusResolved = false;
  let connectionStatus: ConnectionStatus = 'disconnected';
  let disposed = false;

  const events = mitt<{
    connectionStatus: ConnectionStatus;
  }>();

  events.on('connectionStatus', value => {
    connectionStatus = value;
  });

  function changeConnectionStatus(status: ConnectionStatus) {
    events.emit('connectionStatus', status);
  }

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

  function connectionStatusToBoolean(connectionStatus: ConnectionStatus) {
    switch (connectionStatus) {
      case 'disconnected':
      case 'connecting':
        return false;
      case 'connected':
        return true;
    }
  }

  const transportInstance: Transport = {
    provider,

    isCorrectEnvironment() {
      return provider.isCorrectEnvironment();
    },

    isReady() {
      throwIfIncorrectEnvironment();
      throwIfDisposed();

      if (connectionStatusResolved) {
        return Promise.resolve(connectionStatusToBoolean(connectionStatus));
      }

      if (handshakePromise) {
        return handshakePromise;
      }

      changeConnectionStatus('connecting');

      let resolved = false;

      const request = new Promise<boolean>(resolve => {
        const id = nanoid();

        const unsubscribe = transportInstance.subscribe('handshakeResponseV1', responseId => {
          if (responseId !== id) return;
          clearInterval(interval);
          unsubscribe();
          handshakeAbortController.signal.removeEventListener('abort', unsubscribe);
          resolved = true;
          resolve(true);
        });

        handshakeAbortController.signal.addEventListener('abort', unsubscribe, { once: true });

        const interval = setInterval(() => {
          if (handshakeAbortController.signal.aborted) {
            clearInterval(interval);
            resolve(false);
            return;
          }

          transportInstance.postMessage(id, { tag: 'handshakeRequestV1', value: undefined });
        }, HANDSHAKE_INTERVAL);
      });

      const promise =
        handshakeTimeout === Number.POSITIVE_INFINITY
          ? request
          : Promise.race([
              request,
              delay(handshakeTimeout).then(() => {
                if (!resolved) {
                  handshakeAbortController.abort('Timeout');
                }
                return false;
              }),
            ]);

      handshakePromise = promise.then(result => {
        handshakePromise = null;
        connectionStatusResolved = true;
        changeConnectionStatus(result ? 'connected' : 'disconnected');
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
        throw new Error('Polkadot host is not ready');
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

    onConnectionStatusChange(callback: (status: ConnectionStatus) => void) {
      events.on('connectionStatus', callback);

      callback(connectionStatus);

      return () => {
        events.off('connectionStatus', callback);
      };
    },

    dispose() {
      disposed = true;
      provider.dispose();
      changeConnectionStatus('disconnected');
      events.all.clear();
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
