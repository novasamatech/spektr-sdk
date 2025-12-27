import { createNanoEvents } from 'nanoevents';
import { nanoid } from 'nanoid';

import { HANDSHAKE_INTERVAL, JAM_CODEC_PROTOCOL_ID } from './constants.js';
import {
  composeAction,
  delay,
  enumValue,
  errResult,
  isEnumVariant,
  okResult,
  promiseWithResolvers,
} from './helpers.js';
import type {
  ComposeMessageAction,
  MessageActionByVersion,
  MessageVersion,
  PickMessagePayload,
  PickMessagePayloadValue,
} from './interactions/message.js';
import { Message } from './interactions/message.js';
import type { ConnectionStatus, SubscriptionHandler, Transport, TransportProvider } from './types.js';

type TransportParams = Partial<{
  handshakeTimeout: number;
}>;

export function createTransport(provider: TransportProvider, params?: TransportParams): Transport {
  let codecVersion = JAM_CODEC_PROTOCOL_ID;

  const handshakeTimeout = params?.handshakeTimeout ?? Number.POSITIVE_INFINITY;

  const handshakeAbortController = new AbortController();

  let handshakePromise: Promise<boolean> | null = null;
  let connectionStatusResolved = false;
  let connectionStatus: ConnectionStatus = 'disconnected';
  let disposed = false;

  const events = createNanoEvents<{
    connectionStatus: (status: ConnectionStatus) => void;
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

  function throwIfInvalidCodecVersion() {
    if (codecVersion !== JAM_CODEC_PROTOCOL_ID) {
      throw new Error(`Unsupported codec version: ${codecVersion}`);
    }
  }

  function checks() {
    throwIfDisposed();
    throwIfIncorrectEnvironment();
    throwIfInvalidCodecVersion();
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
      checks();

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

        const unsubscribe = transportInstance.listenMessages('v1', 'handshake_response', responseId => {
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

          transportInstance.postMessage(id, enumValue('v1', enumValue('handshake_request', codecVersion)));
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

    async request<const V extends MessageVersion, const Method extends string>(
      version: V,
      method: Method,
      payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'request'>>,
      signal?: AbortSignal,
    ) {
      checks();

      const ready = await transportInstance.isReady();
      if (!ready) {
        throw new Error('Polkadot host is not ready');
      }

      signal?.throwIfAborted();

      const requestId = nanoid();

      const requestAction = composeAction(version, method, 'request');
      const responseAction = composeAction(version, method, 'response');

      const { resolve, reject, promise } =
        promiseWithResolvers<PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'response'>>>();

      const unsubscribe = transportInstance.listenMessages(version, responseAction, (receivedId, payload) => {
        if (receivedId === requestId) {
          unsubscribe();
          unsubscribeSignal();
          resolve(payload.value as PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'response'>>);
        }
      });

      const stop = () => {
        unsubscribe();
        unsubscribeSignal();
        reject(signal?.reason ?? new Error('Request aborted'));
      };

      const unsubscribeSignal = () => {
        signal?.removeEventListener('abort', stop);
      };

      signal?.addEventListener('abort', stop, { once: true });

      const requestMessage = enumValue(
        version,
        enumValue(requestAction, payload) as never as PickMessagePayload<V, ComposeMessageAction<V, Method, 'request'>>,
      );

      transportInstance.postMessage(requestId, requestMessage);

      return promise;
    },

    handleRequest<const V extends MessageVersion, const Method extends string>(
      version: V,
      method: Method,
      handler: (
        message: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'request'>>,
      ) => Promise<PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'response'>>>,
    ) {
      checks();

      const requestAction = composeAction(version, method, 'request');
      const responseAction = composeAction(version, method, 'response');

      return transportInstance.listenMessages(version, requestAction, (requestId, payload) => {
        handler(payload.value as PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'request'>>).then(
          result => {
            const responseMessage = enumValue(
              version,
              enumValue(responseAction, result) as never as PickMessagePayload<
                V,
                ComposeMessageAction<V, Method, 'response'>
              >,
            );

            transportInstance.postMessage(requestId, responseMessage);
          },
        );
      });
    },

    subscribe<const V extends MessageVersion, const Method extends string>(
      version: V,
      method: Method,
      payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'start'>>,
      callback: (payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'receive'>>) => void,
    ) {
      checks();

      const requestId = nanoid();

      const startAction = composeAction(version, method, 'start');
      const stopAction = composeAction(version, method, 'stop');
      const receiveAction = composeAction(version, method, 'receive');

      const unsubscribe = transportInstance.listenMessages(version, receiveAction, (receivedId, data) => {
        if (receivedId === requestId) {
          callback(data.value as PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'receive'>>);
        }
      });

      const startPayload = enumValue(startAction, payload) as never as PickMessagePayload<
        V,
        ComposeMessageAction<V, Method, 'start'>
      >;

      transportInstance.postMessage(requestId, enumValue('v1', startPayload));

      return () => {
        unsubscribe();

        const stopPayload = enumValue(stopAction, undefined) as PickMessagePayload<
          V,
          ComposeMessageAction<V, Method, 'stop'>
        >;

        transportInstance.postMessage(requestId, enumValue('v1', stopPayload));
      };
    },

    handleSubscription<const V extends MessageVersion, const Method extends string>(
      version: V,
      method: Method,
      handler: SubscriptionHandler<V, Method>,
    ) {
      checks();

      const startAction = composeAction(version, method, 'start');
      const stopAction = composeAction(version, method, 'stop');
      const receiveAction = composeAction(version, method, 'receive');

      const subscriptions: Map<string, VoidFunction> = new Map();

      const unsubStart = transportInstance.listenMessages(version, startAction, (requestId, payload) => {
        if (subscriptions.has(requestId)) {
          // subscription already exists
          return null;
        }

        subscriptions.set(
          requestId,
          handler(payload.value as PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'start'>>, value => {
            const receivePayload = enumValue(receiveAction, value) as never as PickMessagePayload<
              V,
              ComposeMessageAction<V, Method, 'receive'>
            >;

            transportInstance.postMessage(requestId, enumValue(version, receivePayload));
          }),
        );
      });

      const unsubStop = transportInstance.listenMessages(version, stopAction, requestId => {
        const unsubscribe = subscriptions.get(requestId);
        unsubscribe?.();
      });

      return () => {
        for (const unsub of subscriptions.values()) {
          unsub();
        }

        unsubStart();
        unsubStop();
      };
    },

    postMessage(requestId, payload) {
      checks();

      const encoded = Message.enc({ requestId, payload });
      provider.postMessage(encoded);
    },

    listenMessages<const V extends MessageVersion, const Action extends MessageActionByVersion<V>>(
      version: V,
      action: Action,
      callback: (requestId: string, data: PickMessagePayload<V, Action>) => void,
    ) {
      return provider.subscribe(message => {
        let result;
        try {
          result = Message.dec(message);
        } catch {
          return;
        }

        if (isEnumVariant(result.payload, version)) {
          const value = result.payload.value;
          if (isEnumVariant(value, action)) {
            callback(result.requestId, value as PickMessagePayload<V, Action>);
          }
        }
      });
    },

    onConnectionStatusChange(callback: (status: ConnectionStatus) => void) {
      callback(connectionStatus);

      return events.on('connectionStatus', callback);
    },

    dispose() {
      disposed = true;
      provider.dispose();
      changeConnectionStatus('disconnected');
      events.events = {};
      handshakeAbortController.abort('Transport disposed');
    },
  };

  if (provider.isCorrectEnvironment()) {
    transportInstance.handleRequest('v1', 'handshake', async version => {
      codecVersion = version;

      switch (version) {
        case JAM_CODEC_PROTOCOL_ID:
          return okResult(undefined);
        default:
          return errResult(enumValue('UnsupportedProtocolVersion', undefined));
      }
    });
  }

  return transportInstance;
}
