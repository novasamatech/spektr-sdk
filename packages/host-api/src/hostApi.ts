import type { ResultAsync } from 'neverthrow';
import { errAsync, fromPromise, okAsync } from 'neverthrow';
import type { Codec, CodecType } from 'scale-ts';

import { extractErrorMessage } from './helpers.js';
import { GenericError } from './protocol/commonCodecs.js';
import type { HostApiProtocol, VersionedRequest, VersionedSubscription } from './protocol/impl.js';
import { CreateProofErr, RequestCredentialsErr } from './protocol/v1/accounts.js';
import { ChatContactRegistrationErr, ChatMessagePostingErr } from './protocol/v1/chat.js';
import { CreateTransactionErr } from './protocol/v1/createTransaction.js';
import { HandshakeErr } from './protocol/v1/handshake.js';
import { PermissionErr } from './protocol/v1/permission.js';
import { SigningErr } from './protocol/v1/sign.js';
import { StatementProofErr } from './protocol/v1/statementStore.js';
import { StorageErr } from './protocol/v1/storage.js';
import type { Subscription, Transport } from './types.js';

type Value<T extends Codec<any> | Codec<never>> = T extends Codec<any> ? CodecType<T> : unknown;

type UnwrapVersionedResult<T> = T extends { tag: infer Tag; value: infer Value }
  ? ResultAsync<
      {
        tag: Tag;
        value: SuccessResponse<Value>;
      },
      {
        tag: Tag;
        value: ErrorResponse<Value>;
      }
    >
  : never;

type SuccessResponse<T> = T extends { success: true; value: infer U } ? U : never;
type ErrorResponse<T> = T extends { success: false; value: infer U } ? U : never;

type InferRequestMethod<Method extends VersionedRequest> = (
  args: Value<Method['request']>,
) => UnwrapVersionedResult<Value<Method['response']>>;

type InferSubscribeMethod<Method extends VersionedSubscription> = (
  args: Value<Method['start']>,
  callback: (payload: Value<Method['receive']>) => void,
) => Subscription;

type InferMethod<Method extends VersionedRequest | VersionedSubscription> = Method extends VersionedRequest
  ? InferRequestMethod<Method>
  : Method extends VersionedSubscription
    ? InferSubscribeMethod<Method>
    : never;

type HostApi = {
  [K in keyof HostApiProtocol]: InferMethod<HostApiProtocol[K]>;
};

export function createHostApi(transport: Transport): HostApi {
  return {
    handshake(payload) {
      const response = fromPromise(transport.request('handshake', payload), e => ({
        tag: payload.tag,
        value: new HandshakeErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },
    feature(payload) {
      const response = fromPromise(transport.request('feature', payload), e => ({
        tag: payload.tag,
        value: new GenericError({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },
    permission_request(payload) {
      const response = fromPromise(transport.request('permission_request', payload), e => ({
        tag: payload.tag,
        value: new PermissionErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    storage_read(payload) {
      const response = fromPromise(transport.request('storage_read', payload), e => ({
        tag: payload.tag,
        value: new StorageErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    storage_write(payload) {
      const response = fromPromise(transport.request('storage_write', payload), e => ({
        tag: payload.tag,
        value: new StorageErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    storage_clear(payload) {
      const response = fromPromise(transport.request('storage_clear', payload), e => ({
        tag: payload.tag,
        value: new StorageErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    account_get(payload) {
      const response = fromPromise(transport.request('account_get', payload), e => ({
        tag: payload.tag,
        value: new RequestCredentialsErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    account_get_alias(payload) {
      const response = fromPromise(transport.request('account_get_alias', payload), e => ({
        tag: payload.tag,
        value: new RequestCredentialsErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    account_create_proof(payload) {
      const response = fromPromise(transport.request('account_create_proof', payload), e => ({
        tag: payload.tag,
        value: new CreateProofErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    get_non_product_accounts(payload) {
      const response = fromPromise(transport.request('get_non_product_accounts', payload), e => ({
        tag: payload.tag,
        value: new RequestCredentialsErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    create_transaction(payload) {
      const response = fromPromise(transport.request('create_transaction', payload), e => ({
        tag: payload.tag,
        value: new CreateTransactionErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    create_transaction_with_non_product_account(payload) {
      const response = fromPromise(transport.request('create_transaction_with_non_product_account', payload), e => ({
        tag: payload.tag,
        value: new CreateTransactionErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    sign_raw(payload) {
      const response = fromPromise(transport.request('sign_raw', payload), e => ({
        tag: payload.tag,
        value: new SigningErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    sign_payload(payload) {
      const response = fromPromise(transport.request('sign_payload', payload), e => ({
        tag: payload.tag,
        value: new SigningErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    chat_create_contact(payload) {
      const response = fromPromise(transport.request('chat_create_contact', payload), e => ({
        tag: payload.tag,
        value: new ChatContactRegistrationErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    chat_post_message(payload) {
      const response = fromPromise(transport.request('chat_post_message', payload), e => ({
        tag: payload.tag,
        value: new ChatMessagePostingErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    chat_action_subscribe(args, callback) {
      return transport.subscribe('chat_action_subscribe', args, callback);
    },

    statement_store_create_proof(payload) {
      const response = fromPromise(transport.request('statement_store_create_proof', payload), e => ({
        tag: payload.tag,
        value: new StatementProofErr.Unknown({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    jsonrpc_message_send(payload) {
      const response = fromPromise(transport.request('jsonrpc_message_send', payload), e => ({
        tag: payload.tag,
        value: new GenericError({ reason: extractErrorMessage(e) }),
      }));

      return response.andThen(response => {
        if (response.value.success) {
          return okAsync({
            tag: response.tag,
            value: response.value.value,
          });
        }

        return errAsync({
          tag: response.tag,
          value: response.value.value,
        });
      });
    },

    jsonrpc_message_subscribe(args, callback) {
      return transport.subscribe('jsonrpc_message_subscribe', args, callback);
    },
  };
}
