import type { CodecType } from 'scale-ts';
import { Enum, Struct, str } from 'scale-ts';

import { createVersionedRequest, createVersionedSubscription } from './helpers.js';
import {
  AccountCreateProofV1_request,
  AccountCreateProofV1_response,
  AccountGetAliasV1_request,
  AccountGetAliasV1_response,
  AccountGetV1_request,
  AccountGetV1_response,
  GetNonProductAccountsV1_request,
  GetNonProductAccountsV1_response,
} from './v1/accounts.js';
import {
  ChatActionSubscribeV1_receive,
  ChatActionSubscribeV1_start,
  ChatCreateContactV1_request,
  ChatCreateContactV1_response,
  ChatPostMessageV1_request,
  ChatPostMessageV1_response,
} from './v1/chat.js';
import {
  CreateTransactionV1_request,
  CreateTransactionV1_response,
  CreateTransactionWithNonProductAccountV1_request,
  CreateTransactionWithNonProductAccountV1_response,
} from './v1/createTransaction.js';
import { FeatureV1_request, FeatureV1_response } from './v1/feature.js';
import { HandshakeV1_request, HandshakeV1_response } from './v1/handshake.js';
import {
  JsonRpcMessageSendV1_request,
  JsonRpcMessageSendV1_response,
  JsonRpcMessageSubscribeV1_receive,
  JsonRpcMessageSubscribeV1_start,
} from './v1/jsonRpc.js';
import { PermissionRequestV1_request, PermissionRequestV1_response } from './v1/permission.js';
import { SignPayloadV1_request, SignPayloadV1_response, SignRawV1_request, SignRawV1_response } from './v1/sign.js';
import { StatementStoreCreateProofV1_request, StatementStoreCreateProofV1_response } from './v1/statementStore.js';
import {
  StorageClearV1_request,
  StorageClearV1_response,
  StorageReadV1_request,
  StorageReadV1_response,
  StorageWriteV1_request,
  StorageWriteV1_response,
} from './v1/storage.js';

export type MessagePayloadSchema = CodecType<typeof MessagePayload>;
export const MessagePayload = Enum({
  // host requests

  ...createVersionedRequest('handshake', {
    v1: [HandshakeV1_request, HandshakeV1_response],
  }),
  ...createVersionedRequest('feature', {
    v1: [FeatureV1_request, FeatureV1_response],
  }),
  ...createVersionedRequest('permission_request', {
    v1: [PermissionRequestV1_request, PermissionRequestV1_response],
  }),

  // storage

  ...createVersionedRequest('storage_read', {
    v1: [StorageReadV1_request, StorageReadV1_response],
  }),
  ...createVersionedRequest('storage_write', {
    v1: [StorageWriteV1_request, StorageWriteV1_response],
  }),
  ...createVersionedRequest('storage_clear', {
    v1: [StorageClearV1_request, StorageClearV1_response],
  }),

  // accounts

  ...createVersionedRequest('account_get', {
    v1: [AccountGetV1_request, AccountGetV1_response],
  }),
  ...createVersionedRequest('account_get_alias', {
    v1: [AccountGetAliasV1_request, AccountGetAliasV1_response],
  }),
  ...createVersionedRequest('account_create_proof', {
    v1: [AccountCreateProofV1_request, AccountCreateProofV1_response],
  }),
  ...createVersionedRequest('get_non_product_accounts', {
    v1: [GetNonProductAccountsV1_request, GetNonProductAccountsV1_response],
  }),

  // signing

  ...createVersionedRequest('create_transaction', {
    v1: [CreateTransactionV1_request, CreateTransactionV1_response],
  }),
  ...createVersionedRequest('create_transaction_with_non_product_account', {
    v1: [CreateTransactionWithNonProductAccountV1_request, CreateTransactionWithNonProductAccountV1_response],
  }),
  ...createVersionedRequest('sign_raw', {
    v1: [SignRawV1_request, SignRawV1_response],
  }),
  ...createVersionedRequest('sign_payload', {
    v1: [SignPayloadV1_request, SignPayloadV1_response],
  }),

  // chat

  ...createVersionedRequest('chat_create_contact', {
    v1: [ChatCreateContactV1_request, ChatCreateContactV1_response],
  }),
  ...createVersionedRequest('chat_post_message', {
    v1: [ChatPostMessageV1_request, ChatPostMessageV1_response],
  }),
  ...createVersionedSubscription('chat_action_subscribe', {
    v1: [ChatActionSubscribeV1_start, ChatActionSubscribeV1_receive],
  }),

  // statement store

  ...createVersionedRequest('statement_store_create_proof', {
    v1: [StatementStoreCreateProofV1_request, StatementStoreCreateProofV1_response],
  }),

  // json rpc

  ...createVersionedRequest('jsonrpc_message_send', {
    v1: [JsonRpcMessageSendV1_request, JsonRpcMessageSendV1_response],
  }),
  ...createVersionedSubscription('jsonrpc_message_subscribe', {
    v1: [JsonRpcMessageSubscribeV1_start, JsonRpcMessageSubscribeV1_receive],
  }),
});

export type MessageSchema = CodecType<typeof Message>;
export const Message = Struct({
  requestId: str,
  payload: MessagePayload,
});

export type MessageAction = MessagePayloadSchema['tag'];

export type PickMessagePayload<Action extends MessageAction> = Extract<MessagePayloadSchema, { tag: Action }>;

export type PickMessagePayloadValue<Action extends MessageAction> =
  PickMessagePayload<Action> extends never ? never : PickMessagePayload<Action>['value'];

export type ComposeMessageAction<
  Method extends string,
  Action extends string,
> = `${Method}_${Action}` extends MessageAction ? `${Method}_${Action}` : never;
