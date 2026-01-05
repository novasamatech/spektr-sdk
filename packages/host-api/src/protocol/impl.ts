import type { Codec } from 'scale-ts';

import type { EnumCodec } from './commonCodecs.js';
import { Enum } from './commonCodecs.js';
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

// helpers

export type VersionedArguments = Record<string, [Codec<any>, Codec<any>]>;

type InferVersionedArgument<EnumValues extends VersionedArguments, N extends number> = {
  [V in keyof EnumValues]: EnumValues[V][N];
};

export type VersionedProtocolRequest<T extends VersionedArguments = VersionedArguments> = {
  type: 'request';
  request: EnumCodec<InferVersionedArgument<T, 0>>;
  response: EnumCodec<InferVersionedArgument<T, 1>>;
};

export type VersionedProtocolSubscription<T extends VersionedArguments = VersionedArguments> = {
  type: 'subscription';
  start: EnumCodec<InferVersionedArgument<T, 0>>;
  receive: EnumCodec<InferVersionedArgument<T, 1>>;
};

const enumFromArg = <const Values extends VersionedArguments, const N extends number>(enumValues: Values, n: N) => {
  return Enum(
    Object.fromEntries(Object.entries(enumValues).map(([key, value]) => [key, value[n]])) as InferVersionedArgument<
      Values,
      N
    >,
  );
};

const versionedRequest = <const EnumValues extends VersionedArguments>(
  values: EnumValues,
): VersionedProtocolRequest<EnumValues> => {
  return {
    type: 'request',
    request: enumFromArg(values, 0),
    response: enumFromArg(values, 1),
  };
};

const versionedSubscription = <const EnumValues extends VersionedArguments>(
  values: EnumValues,
): VersionedProtocolSubscription<EnumValues> => {
  return {
    type: 'subscription',
    start: enumFromArg(values, 0),
    receive: enumFromArg(values, 1),
  };
};

// actual api

export type HostApiProtocol = {
  // host requests

  handshake: VersionedProtocolRequest<{
    v1: [typeof HandshakeV1_request, typeof HandshakeV1_response];
  }>;

  feature: VersionedProtocolRequest<{
    v1: [typeof FeatureV1_request, typeof FeatureV1_response];
  }>;

  permission_request: VersionedProtocolRequest<{
    v1: [typeof PermissionRequestV1_request, typeof PermissionRequestV1_response];
  }>;

  // storage

  storage_read: VersionedProtocolRequest<{
    v1: [typeof StorageReadV1_request, typeof StorageReadV1_response];
  }>;

  storage_write: VersionedProtocolRequest<{
    v1: [typeof StorageWriteV1_request, typeof StorageWriteV1_response];
  }>;

  storage_clear: VersionedProtocolRequest<{
    v1: [typeof StorageClearV1_request, typeof StorageClearV1_response];
  }>;

  // accounts

  account_get: VersionedProtocolRequest<{
    v1: [typeof AccountGetV1_request, typeof AccountGetV1_response];
  }>;

  account_get_alias: VersionedProtocolRequest<{
    v1: [typeof AccountGetAliasV1_request, typeof AccountGetAliasV1_response];
  }>;

  account_create_proof: VersionedProtocolRequest<{
    v1: [typeof AccountCreateProofV1_request, typeof AccountCreateProofV1_response];
  }>;

  get_non_product_accounts: VersionedProtocolRequest<{
    v1: [typeof GetNonProductAccountsV1_request, typeof GetNonProductAccountsV1_response];
  }>;

  // signing

  create_transaction: VersionedProtocolRequest<{
    v1: [typeof CreateTransactionV1_request, typeof CreateTransactionV1_response];
  }>;

  create_transaction_with_non_product_account: VersionedProtocolRequest<{
    v1: [
      typeof CreateTransactionWithNonProductAccountV1_request,
      typeof CreateTransactionWithNonProductAccountV1_response,
    ];
  }>;

  sign_raw: VersionedProtocolRequest<{
    v1: [typeof SignRawV1_request, typeof SignRawV1_response];
  }>;

  sign_payload: VersionedProtocolRequest<{
    v1: [typeof SignPayloadV1_request, typeof SignPayloadV1_response];
  }>;

  // chat

  chat_create_contact: VersionedProtocolRequest<{
    v1: [typeof ChatCreateContactV1_request, typeof ChatCreateContactV1_response];
  }>;

  chat_post_message: VersionedProtocolRequest<{
    v1: [typeof ChatPostMessageV1_request, typeof ChatPostMessageV1_response];
  }>;

  chat_action_subscribe: VersionedProtocolSubscription<{
    v1: [typeof ChatActionSubscribeV1_start, typeof ChatActionSubscribeV1_receive];
  }>;

  // statement store

  statement_store_create_proof: VersionedProtocolRequest<{
    v1: [typeof StatementStoreCreateProofV1_request, typeof StatementStoreCreateProofV1_response];
  }>;

  // json rpc

  jsonrpc_message_send: VersionedProtocolRequest<{
    v1: [typeof JsonRpcMessageSendV1_request, typeof JsonRpcMessageSendV1_response];
  }>;

  jsonrpc_message_subscribe: VersionedProtocolSubscription<{
    v1: [typeof JsonRpcMessageSubscribeV1_start, typeof JsonRpcMessageSubscribeV1_receive];
  }>;
};

export const hostApiProtocol: HostApiProtocol = {
  // host requests

  handshake: versionedRequest({
    v1: [HandshakeV1_request, HandshakeV1_response],
  }),

  feature: versionedRequest({
    v1: [FeatureV1_request, FeatureV1_response],
  }),

  permission_request: versionedRequest({
    v1: [PermissionRequestV1_request, PermissionRequestV1_response],
  }),

  // storage

  storage_read: versionedRequest({
    v1: [StorageReadV1_request, StorageReadV1_response],
  }),

  storage_write: versionedRequest({
    v1: [StorageWriteV1_request, StorageWriteV1_response],
  }),

  storage_clear: versionedRequest({
    v1: [StorageClearV1_request, StorageClearV1_response],
  }),

  // accounts

  account_get: versionedRequest({
    v1: [AccountGetV1_request, AccountGetV1_response],
  }),

  account_get_alias: versionedRequest({
    v1: [AccountGetAliasV1_request, AccountGetAliasV1_response],
  }),

  account_create_proof: versionedRequest({
    v1: [AccountCreateProofV1_request, AccountCreateProofV1_response],
  }),

  get_non_product_accounts: versionedRequest({
    v1: [GetNonProductAccountsV1_request, GetNonProductAccountsV1_response],
  }),

  // signing

  create_transaction: versionedRequest({
    v1: [CreateTransactionV1_request, CreateTransactionV1_response],
  }),

  create_transaction_with_non_product_account: versionedRequest({
    v1: [CreateTransactionWithNonProductAccountV1_request, CreateTransactionWithNonProductAccountV1_response],
  }),

  sign_raw: versionedRequest({
    v1: [SignRawV1_request, SignRawV1_response],
  }),

  sign_payload: versionedRequest({
    v1: [SignPayloadV1_request, SignPayloadV1_response],
  }),

  // chat

  chat_create_contact: versionedRequest({
    v1: [ChatCreateContactV1_request, ChatCreateContactV1_response],
  }),

  chat_post_message: versionedRequest({
    v1: [ChatPostMessageV1_request, ChatPostMessageV1_response],
  }),

  chat_action_subscribe: versionedSubscription({
    v1: [ChatActionSubscribeV1_start, ChatActionSubscribeV1_receive],
  }),

  // statement store

  statement_store_create_proof: versionedRequest({
    v1: [StatementStoreCreateProofV1_request, StatementStoreCreateProofV1_response],
  }),

  // json rpc

  jsonrpc_message_send: versionedRequest({
    v1: [JsonRpcMessageSendV1_request, JsonRpcMessageSendV1_response],
  }),

  jsonrpc_message_subscribe: versionedSubscription({
    v1: [JsonRpcMessageSubscribeV1_start, JsonRpcMessageSubscribeV1_receive],
  }),
};
