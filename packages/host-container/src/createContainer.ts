import type {
  Account,
  CodecType,
  ConnectionStatus,
  HexString,
  ProductAccountId,
  Provider,
  TxPayloadV1Interface,
} from '@novasamatech/host-api';
import {
  assertEnumVariant,
  createTransport,
  enumValue,
  errResult,
  fromHex,
  isEnumVariant,
  okResult,
  toHex,
} from '@novasamatech/host-api';
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';

const UNSUPPORTED_MESSAGE_FORMAT_ERROR = 'Unsupported message format';

function errorToString(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
}

type ContainerHandlers = {
  nonProductAccounts(): Promise<CodecType<typeof Account>[]>;
  signRaw(raw: SignerPayloadRaw): Promise<SignerResult>;
  signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
  createTransaction(account: CodecType<typeof ProductAccountId>, payload: TxPayloadV1Interface): Promise<HexString>;
  createTransactionWithNonProductAccount(payload: TxPayloadV1Interface): Promise<HexString>;
  chainSupport(genesisHash: HexString): Promise<boolean>;
  storage: {
    onRead(key: HexString): Promise<Uint8Array | null>;
    onWrite(key: HexString, value: Uint8Array): Promise<void>;
    onClear(key: HexString): Promise<void>;
  };
  chat: {
    registration(): Promise<void>;
    onMessage(callback: (message: string) => void): () => void;
    sendAction(): Promise<void>;
  };
};

export type Container = ReturnType<typeof createContainer>;

const defaultHandlers: ContainerHandlers = {
  nonProductAccounts: async () => [],
  signRaw: () => Promise.reject(new Error('signRaw is not implemented')),
  signPayload: () => Promise.reject(new Error('signPayload is not implemented')),
  createTransaction() {
    return Promise.reject('Not implemented');
  },
  storage: {
    onRead() {
      return Promise.reject('Not implemented');
    },
    onWrite() {
      return Promise.reject('Not implemented');
    },
    onClear() {
      return Promise.reject('Not implemented');
    },
  },
  chat: {
    registration(): Promise<void> {
      return Promise.reject('Not implemented');
    },
    onMessage() {
      return () => {
        /* empty */
      };
    },
    sendAction() {
      return Promise.reject('Not implemented');
    },
  },
  createTransactionWithNonProductAccount() {
    return Promise.reject('Not implemented');
  },
  chainSupport: async () => false,
};

export function createContainer(provider: Provider) {
  const transport = createTransport(provider);
  if (!transport.isCorrectEnvironment()) {
    throw new Error('Transport is not available: dapp provider has incorrect environment');
  }

  const externalHandlers: Partial<ContainerHandlers> = {};

  // account subscription

  transport.handleRequest('get_non_product_accounts', async payload => {
    assertEnumVariant(payload, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);

    try {
      const nonProductAccounts = externalHandlers.nonProductAccounts ?? defaultHandlers.nonProductAccounts;
      const accounts = await nonProductAccounts();

      return enumValue('v1', okResult(accounts));
    } catch (e) {
      return enumValue('v1', errResult(enumValue('Unknown', { reason: errorToString(e) })));
    }
  });

  // sign subscription

  transport.handleRequest('sign_raw', async message => {
    try {
      assertEnumVariant(message, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);

      const signRaw = externalHandlers.signRaw ?? defaultHandlers.signRaw;
      let payload: SignerPayloadRaw;

      const value = message.value;

      switch (value.data.tag) {
        case 'Bytes':
          payload = {
            address: value.address,
            data: toHex(value.data.value),
            type: 'bytes',
          };
          break;
        case 'Payload':
          payload = {
            address: value.address,
            data: value.data.value,
            type: 'payload',
          };
          break;
      }

      const result = await signRaw(payload);

      const response = {
        signature: result.signature,
        signedTransaction: result.signedTransaction
          ? typeof result.signedTransaction === 'string'
            ? result.signedTransaction
            : toHex(result.signedTransaction)
          : undefined,
      };

      return enumValue('v1', okResult(response));
    } catch (e) {
      return enumValue('v1', errResult(enumValue('Unknown', { reason: errorToString(e) })));
    }
  });

  transport.handleRequest('sign_payload', async message => {
    try {
      assertEnumVariant(message, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);

      const signPayload = externalHandlers.signPayload ?? defaultHandlers.signPayload;

      const result = await signPayload(message.value);

      const response = {
        signature: result.signature,
        signedTransaction: result.signedTransaction
          ? typeof result.signedTransaction === 'string'
            ? result.signedTransaction
            : toHex(result.signedTransaction)
          : undefined,
      };

      return enumValue('v1', okResult(response));
    } catch (e) {
      return enumValue('v1', errResult(enumValue('Unknown', { reason: errorToString(e) })));
    }
  });

  transport.handleRequest('create_transaction', async message => {
    try {
      assertEnumVariant(message, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);

      const createTransaction = externalHandlers.createTransaction ?? defaultHandlers.createTransaction;
      const [productAccountId, payload] = message.value;
      assertEnumVariant(payload, 'v1', 'Unsupported transaction version');

      const transaction = {
        version: 1,
        ...payload.value,
      } as const;
      const result = await createTransaction(productAccountId, transaction);

      return enumValue('v1', okResult(fromHex(result)));
    } catch (e) {
      return enumValue('v1', errResult(enumValue('Unknown', { reason: errorToString(e) })));
    }
  });

  transport.handleRequest('create_transaction_with_non_product_account', async message => {
    try {
      assertEnumVariant(message, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);

      const createTransactionWithNonProductAccount =
        externalHandlers.createTransactionWithNonProductAccount ??
        defaultHandlers.createTransactionWithNonProductAccount;
      const payload = message.value;
      assertEnumVariant(payload, 'v1', 'Unsupported transaction version');

      const transaction = {
        version: 1,
        ...payload.value,
      } as const;
      const result = await createTransactionWithNonProductAccount(transaction);

      return enumValue('v1', okResult(fromHex(result)));
    } catch (e) {
      return enumValue('v1', errResult(enumValue('Unknown', { reason: errorToString(e) })));
    }
  });

  // feature support handling

  transport.handleRequest('feature', async message => {
    if (!isEnumVariant(message, 'v1')) {
      return enumValue('v1', errResult({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR }));
    }

    switch (message.value.tag) {
      case 'chain': {
        try {
          const checkChainSupport = externalHandlers.chainSupport ?? defaultHandlers.chainSupport;
          const result = await checkChainSupport(message.value.value);
          return enumValue('v1', okResult(result));
        } catch (e) {
          return enumValue('v1', errResult({ reason: errorToString(e) }));
        }
      }
      default: {
        return enumValue('v1', errResult({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR }));
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

      return transport.handleSubscription('jsonrpc_message_subscribe', (params, send) => {
        assertEnumVariant(params, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);
        if (params.value !== genesisHash) {
          return () => {
            // empty subscription, we don't want to react to foreign chain subscription request
          };
        }

        const connection = provider(message => send(enumValue('v1', message)));

        const unsubRequests = transport.handleRequest('jsonrpc_message_send', async message => {
          assertEnumVariant(message, 'v1', UNSUPPORTED_MESSAGE_FORMAT_ERROR);
          const [requestedGenesisHash, payload] = message.value;
          if (requestedGenesisHash !== genesisHash) {
            return enumValue('v1', okResult(undefined));
          }
          connection.send(payload);
          return enumValue('v1', okResult(undefined));
        });

        return () => {
          unsubRequests();
          connection?.disconnect();
        };
      });
    },

    handleNonProductAccounts(handler: ContainerHandlers['nonProductAccounts']) {
      init();
      externalHandlers.nonProductAccounts = handler;
    },

    handleSignRawRequest(handler: ContainerHandlers['signRaw']) {
      init();
      externalHandlers.signRaw = handler;
    },

    handleSignPayloadRequest(handler: ContainerHandlers['signPayload']) {
      init();
      externalHandlers.signPayload = handler;
    },

    handleChainSupportCheck(handler: ContainerHandlers['chainSupport']) {
      init();
      externalHandlers.chainSupport = handler;
    },

    handleCreateTransaction(handler: ContainerHandlers['createTransaction']) {
      init();
      externalHandlers.createTransaction = handler;
    },

    handleCreateTransactionWithNonProductAccount(handler: ContainerHandlers['createTransactionWithNonProductAccount']) {
      init();
      externalHandlers.createTransactionWithNonProductAccount = handler;
    },

    handleChat(handler: ContainerHandlers['chat']) {
      init();
      externalHandlers.chat = handler;
    },

    isReady() {
      return transport.isReady();
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
