import type { ConnectionStatus, Provider } from '@novasamatech/host-api';
import {
  ChatContactRegistrationErr,
  ChatMessagePostingErr,
  CreateProofErr,
  CreateTransactionErr,
  GenericError,
  PermissionErr,
  RequestCredentialsErr,
  SigningErr,
  StatementProofErr,
  StorageErr,
  assertEnumVariant,
  createTransport,
  enumValue,
  errResult,
  isEnumVariant,
  okResult,
} from '@novasamatech/host-api';
import type { Result } from 'neverthrow';
import { err, errAsync, ok, okAsync } from 'neverthrow';

import type { Container } from './types.js';

const UNSUPPORTED_MESSAGE_FORMAT_ERROR = 'Unsupported message format';

function guardVersion<const Enum extends { tag: string; value: unknown }, const Tag extends Enum['tag'], const Err>(
  value: Enum,
  tag: Tag,
  error: Err,
): Result<Enum['value'], Err> {
  if (isEnumVariant(value, tag)) {
    return ok(value.value);
  }
  return err(error);
}

export function createContainer(provider: Provider): Container {
  const transport = createTransport(provider);
  if (!transport.isCorrectEnvironment()) {
    throw new Error('Transport is not available: dapp provider has incorrect environment');
  }

  function init() {
    // init status subscription
    transport.isReady();
  }

  return {
    handleFeature(handler) {
      return transport.handleRequest('feature', async message => {
        const version = 'v1';
        const error = new GenericError({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(message, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handlePermissionRequest(handler) {
      return transport.handleRequest('permission_request', async message => {
        const version = 'v1';
        const error = new PermissionErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(message, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleStorageRead(handler) {
      return transport.handleRequest('storage_read', async message => {
        const version = 'v1';
        const error = new StorageErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(message, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleStorageWrite(handler) {
      return transport.handleRequest('storage_write', async message => {
        const version = 'v1';
        const error = new StorageErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(message, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleStorageClear(handler) {
      return transport.handleRequest('storage_clear', async params => {
        const version = 'v1';
        const error = new StorageErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleAccountGet(handler) {
      return transport.handleRequest('account_get', async params => {
        const version = 'v1';
        const error = new RequestCredentialsErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleAccountGetAlias(handler) {
      return transport.handleRequest('account_get_alias', async params => {
        const version = 'v1';
        const error = new RequestCredentialsErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleAccountCreateProof(handler) {
      return transport.handleRequest('account_create_proof', async params => {
        const version = 'v1';
        const error = new CreateProofErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleGetNonProductAccounts(handler) {
      return transport.handleRequest('get_non_product_accounts', async params => {
        const version = 'v1';
        const error = new RequestCredentialsErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleCreateTransaction(handler) {
      return transport.handleRequest('create_transaction', async params => {
        const version = 'v1';
        const error = new CreateTransactionErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleCreateTransactionWithNonProductAccount(handler) {
      return transport.handleRequest('create_transaction_with_non_product_account', async params => {
        const version = 'v1';
        const error = new CreateTransactionErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleSignRaw(handler) {
      return transport.handleRequest('sign_raw', async params => {
        const version = 'v1';
        const error = new SigningErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleSignPayload(handler) {
      return transport.handleRequest('sign_payload', async params => {
        const version = 'v1';
        const error = new SigningErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleChatCreateContact(handler) {
      return transport.handleRequest('chat_create_contact', async params => {
        const version = 'v1';
        const error = new ChatContactRegistrationErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleChatPostMessage(handler) {
      return transport.handleRequest('chat_post_message', async params => {
        const version = 'v1';
        const error = new ChatMessagePostingErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleChatActionSubscribe(handler) {
      return transport.handleSubscription('chat_action_subscribe', (params, send, interrupt) => {
        const version = 'v1';

        return guardVersion(params, version, null)
          .map(params => handler(params, payload => send(enumValue(version, payload)), interrupt))
          .orTee(interrupt)
          .unwrapOr(() => {
            /* empty */
          });
      });
    },

    handleStatementStoreCreateProof(handler) {
      return transport.handleRequest('statement_store_create_proof', async params => {
        const version = 'v1';
        const error = new StatementProofErr.Unknown({ reason: UNSUPPORTED_MESSAGE_FORMAT_ERROR });

        return guardVersion(params, version, error)
          .asyncMap(async params => handler(params, { ok: okAsync<any>, err: errAsync<never, any> }))
          .andThen(r => r.map(r => enumValue(version, okResult(r))))
          .orElse(r => ok(enumValue(version, errResult(r))))
          .unwrapOr(enumValue(version, errResult(error)));
      });
    },

    handleJsonRpcMessageSubscribe(genesisHash, provider) {
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
