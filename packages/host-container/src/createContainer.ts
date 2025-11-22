import type { HexString } from '@novasamatech/spektr-sdk-shared';
import type { ConnectionStatus, InjectedAccountSchema, TransportProvider } from '@novasamatech/spektr-sdk-transport';
import { createTransport } from '@novasamatech/spektr-sdk-transport';
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import type { JsonRpcConnection, JsonRpcProvider } from '@polkadot-api/json-rpc-provider';

import { createComplexSubscriber } from './createComplexSubscriber';

function formatError(e: unknown) {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';

  return { tag: 'error' as const, value: message };
}

type ContainerHandlers = {
  accounts: {
    get(): Promise<InjectedAccountSchema[]>;
    subscribe(callback: (accounts: InjectedAccountSchema[]) => void): VoidFunction;
  };
  sign: {
    signRaw(raw: SignerPayloadRaw): Promise<SignerResult>;
    signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
  };
  chainSupport(chainId: HexString): Promise<boolean>;
};

export type Container = ReturnType<typeof createContainer>;

const defaultHandlers: ContainerHandlers = {
  accounts: {
    get: async () => [],
    subscribe: () => () => {
      /* empty */
    },
  },
  sign: {
    signRaw: () => Promise.reject(new Error('Sign is not implemented')),
    signPayload: () => Promise.reject(new Error('Sign is not implemented')),
  },
  chainSupport: async () => false,
};

export function createContainer(provider: TransportProvider) {
  const transport = createTransport(provider, { handshakeTimeout: Number.POSITIVE_INFINITY });
  if (!transport.isCorrectEnvironment()) {
    throw new Error('Transport is not available: dapp provider has incorrect environment');
  }

  const externalHandlers: Partial<ContainerHandlers> = {};

  // account subscription

  transport.handleMessage<'getAccountsRequestV1', 'getAccountsResponseV1'>('getAccountsRequestV1', async () => {
    try {
      const handler = externalHandlers.accounts ?? defaultHandlers.accounts;
      const accounts = await handler.get();

      return {
        tag: 'getAccountsResponseV1',
        value: { tag: 'success', value: accounts },
      };
    } catch (e) {
      return {
        tag: 'getAccountsResponseV1',
        value: formatError(e),
      };
    }
  });

  const accountSubscriber = transport
    ? createComplexSubscriber<'accountSubscriptionV1', 'getAccountsResponseV1'>({
        transport,
        subscribeRequest: 'accountSubscriptionV1',
        unsubscribeRequest: 'accountUnsubscriptionV1',
        getSubscriber() {
          return callback => {
            const subscriber = externalHandlers.accounts?.subscribe ?? defaultHandlers.accounts.subscribe;

            return subscriber(accounts => {
              callback({
                tag: 'getAccountsResponseV1',
                value: { tag: 'success', value: accounts },
              });
            });
          };
        },
      })
    : null;

  // sign subscription

  transport.handleMessage<'signRawRequestV1', 'signResponseV1'>('signRawRequestV1', async message => {
    try {
      const signRaw = externalHandlers.sign?.signRaw ?? defaultHandlers.sign.signRaw;
      const result = await signRaw(message);
      return {
        tag: 'signResponseV1',
        value: { tag: 'success', value: result },
      };
    } catch (e) {
      return {
        tag: 'signResponseV1',
        value: formatError(e),
      };
    }
  });

  transport.handleMessage<'signPayloadRequestV1', 'signResponseV1'>('signPayloadRequestV1', async message => {
    try {
      const signPayload = externalHandlers.sign?.signPayload ?? defaultHandlers.sign.signPayload;
      const result = await signPayload(message);
      return {
        tag: 'signResponseV1',
        value: { tag: 'success', value: result },
      };
    } catch (e) {
      return {
        tag: 'signResponseV1',
        value: formatError(e),
      };
    }
  });

  // chain support subscription

  transport.handleMessage<'supportFeatureRequestV1', 'supportFeatureResponseV1'>(
    'supportFeatureRequestV1',
    async message => {
      if (message.tag === 'chain') {
        try {
          const checkChainSupport = externalHandlers.chainSupport ?? defaultHandlers.chainSupport;
          const result = await checkChainSupport(message.value.chainId);
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
            value: formatError(e),
          };
        }
      }
    },
  );

  return {
    connectToPapiProvider(chainId: HexString, provider: JsonRpcProvider) {
      let connection: JsonRpcConnection | null = null;

      return transport.handleMessage('papiProviderSendMessageV1', async message => {
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

    handleAccounts(handler: ContainerHandlers['accounts']) {
      externalHandlers.accounts = handler;
      accountSubscriber?.replaceSubscriber();
    },

    handleSignRequest(handler: ContainerHandlers['sign']) {
      externalHandlers.sign = handler;
    },

    handleChainSupportCheck(handler: ContainerHandlers['chainSupport']) {
      externalHandlers.chainSupport = handler;
    },

    isReady() {
      return transport.isReady();
    },

    subscribeLocationChange(callback: (location: string) => void) {
      transport.handleMessage('locationChangedV1', async location => {
        callback(location);
      });
    },

    subscribeConnectionStatus(callback: (connectionStatus: ConnectionStatus) => void) {
      return transport.onConnectionStatusChange(callback);
    },

    dispose() {
      transport.dispose();
    },
  };
}
