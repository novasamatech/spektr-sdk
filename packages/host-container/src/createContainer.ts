import type {
  ConnectionStatus,
  HexString,
  InjectedAccountSchema,
  TransportProvider,
  TxPayloadV1,
} from '@novasamatech/host-api';
import { createTransport } from '@novasamatech/host-api';
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
    createTransaction(payload: TxPayloadV1): Promise<HexString>;
  };
  chainSupport(chainId: HexString): Promise<boolean>;
};

type Params = {
  handshakeTimeout: number;
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
    signRaw: () => Promise.reject(new Error('signRaw is not implemented')),
    signPayload: () => Promise.reject(new Error('signPayload is not implemented')),
    createTransaction: () => Promise.reject(new Error('createTransaction is not implemented')),
  },
  chainSupport: async () => false,
};

export function createContainer(provider: TransportProvider, params?: Params) {
  const transport = createTransport(provider, { handshakeTimeout: params?.handshakeTimeout });
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

  transport.handleMessage<'createTransactionRequestV1', 'createTransactionResponseV1'>(
    'createTransactionRequestV1',
    async message => {
      try {
        const createTransaction = externalHandlers.sign?.createTransaction ?? defaultHandlers.sign.createTransaction;
        const result = await createTransaction(message);
        return {
          tag: 'createTransactionResponseV1',
          value: { tag: 'success', value: result },
        };
      } catch (e) {
        return {
          tag: 'createTransactionResponseV1',
          value: formatError(e),
        };
      }
    },
  );

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

  function init() {
    // init status subscription
    transport.isReady();
  }

  return {
    connectToPapiProvider(chainId: HexString, provider: JsonRpcProvider) {
      init();

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
      init();
      externalHandlers.accounts = handler;
      accountSubscriber?.replaceSubscriber();
    },

    handleSignRequest(handler: ContainerHandlers['sign']) {
      init();
      externalHandlers.sign = handler;
    },

    handleChainSupportCheck(handler: ContainerHandlers['chainSupport']) {
      init();
      externalHandlers.chainSupport = handler;
    },

    isReady() {
      return transport.isReady();
    },

    subscribeLocationChange(callback: (location: string) => void) {
      init();
      return transport.subscribe('locationChangedV1', async location => {
        callback(location);
      });
    },

    subscribeConnectionStatus(callback: (connectionStatus: ConnectionStatus) => void) {
      // this specific order exists because container should report all connection statuses including "disconnected",
      // which immediately got changed to "connecting" after init() call.
      const unsubscribe = transport.onConnectionStatusChange(callback);
      init();
      return unsubscribe;
    },

    dispose() {
      transport.dispose();
    },
  };
}
