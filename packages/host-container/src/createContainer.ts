import type {
  Account,
  AccountId,
  CodecType,
  ConnectionStatus,
  HexString,
  ProductAccountId,
  TransportProvider,
  TxPayloadV1Interface,
} from '@novasamatech/host-api';
import { createTransport, errResult, okResult } from '@novasamatech/host-api';
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { toHex } from '@polkadot-api/utils';

function errorToString(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
}

type ContainerHandlers = {
  nonProductAccounts(): Promise<CodecType<typeof Account>[]>;
  sign: {
    signRaw(raw: SignerPayloadRaw): Promise<SignerResult>;
    signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
  };
  createTransaction(account: CodecType<typeof ProductAccountId>, payload: TxPayloadV1Interface): Promise<HexString>;
  createTransactionWithNonProductAccount(
    account: CodecType<typeof AccountId>,
    payload: TxPayloadV1Interface,
  ): Promise<HexString>;
  chainSupport(genesisHash: HexString): Promise<boolean>;
};

export type Container = ReturnType<typeof createContainer>;

const defaultHandlers: ContainerHandlers = {
  nonProductAccounts: async () => [],
  sign: {
    signRaw: () => Promise.reject(new Error('signRaw is not implemented')),
    signPayload: () => Promise.reject(new Error('signPayload is not implemented')),
  },
  createTransaction(): Promise<HexString> {
    return Promise.reject('Not implemented');
  },
  chainSupport: async () => false,
};

export function createContainer(provider: TransportProvider) {
  const transport = createTransport(provider);
  if (!transport.isCorrectEnvironment()) {
    throw new Error('Transport is not available: dapp provider has incorrect environment');
  }

  const externalHandlers: Partial<ContainerHandlers> = {};

  // account subscription

  transport.handleRequest('v1', 'get_non_product_accounts', async () => {
    try {
      const nonProductAccounts = externalHandlers.nonProductAccounts ?? defaultHandlers.nonProductAccounts;
      const accounts = await nonProductAccounts();

      return okResult(accounts);
    } catch (e) {
      return errResult(errorToString(e));
    }
  });

  // sign subscription

  transport.handleRequest('v1', 'sign_raw', async message => {
    try {
      const signRaw = externalHandlers.sign?.signRaw ?? defaultHandlers.sign.signRaw;
      let payload: SignerPayloadRaw;

      switch (message.data.tag) {
        case 'Bytes':
          payload = {
            address: message.address,
            data: toHex(message.data.value),
            type: 'bytes',
          };
          break;
        case 'Payload':
          payload = {
            address: message.address,
            data: message.data.value,
            type: 'payload',
          };
          break;
      }

      const result = await signRaw(payload);
      return okResult(result);
    } catch (e) {
      return errResult(errorToString(e));
    }
  });

  transport.handleRequest('v1', 'sign_payload', async payload => {
    try {
      const signPayload = externalHandlers.sign?.signPayload ?? defaultHandlers.sign.signPayload;

      const result = await signPayload(payload);
      return okResult(result);
    } catch (e) {
      return errResult(errorToString(e));
    }
  });

  transport.handleRequest('v1', 'create_transaction', async ([productAccounId, payload]) => {
    try {
      const createTransaction = externalHandlers.createTransaction ?? defaultHandlers.createTransaction;
      const result = await createTransaction(productAccounId, payload);
      return {
        tag: 'createTransactionResponseV1',
        value: okResult(result),
      };
    } catch (e) {
      return {
        tag: 'createTransactionResponseV1',
        value: errResult(errorToString(e)),
      };
    }
  });

  // feature support handling

  transport.handleRequest('v1', 'feature', async message => {
    switch (message.tag) {
      case 'chain': {
        try {
          const checkChainSupport = externalHandlers.chainSupport ?? defaultHandlers.chainSupport;
          const result = await checkChainSupport(message.value);
          return {
            tag: 'supportFeatureResponseV1',
            value: okResult({ tag: 'chain', value: { genesisHash: message.value, result } }),
          };
        } catch (e) {
          return {
            tag: 'supportFeatureResponseV1',
            value: errResult(errorToString(e)),
          };
        }
      }
      default: {
      }
    }
  });

  function init() {
    // init status subscription
    transport.isReady();
  }

  return {
    connectJsonRpcProvider(genesisHash: HexString, provider: JsonRpcProvider) {
      init();

      return transport.handleSubscription('v1', 'jsonrpc_message_subscribe', (requestedGenesisHash, send) => {
        if (requestedGenesisHash !== genesisHash) {
          return () => {
            // empty subscription, we don't want to react to foreign chain subscription request
          };
        }

        const connection = provider(send);

        return () => {
          connection?.disconnect();
        };
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
