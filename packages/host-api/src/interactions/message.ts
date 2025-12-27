import type { Codec, CodecType } from 'scale-ts';
import { Enum, Struct, _void, str } from 'scale-ts';

import {
  ChatActionSubscribeV1_receive,
  ChatActionSubscribeV1_start,
  ChatCreateContactV1_request,
  ChatCreateContactV1_response,
  ChatPostMessageV1_request,
  ChatPostMessageV1_response,
} from './v1/chat.js';
import { CreateTransactionV1_request, CreateTransactionV1_response } from './v1/createTransaction.js';
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
import {
  StatementStoreCreateProofV1_request,
  StatementStoreCreateProofV1_response,
  StatementStoreQueryV1_request,
  StatementStoreQueryV1_response,
  StatementStoreSubmitV1_request,
  StatementStoreSubmitV1_response,
  StatementStoreSubscribeV1_receive,
  StatementStoreSubscribeV1_start,
} from './v1/statementStore.js';
import {
  StorageClearV1_request,
  StorageClearV1_response,
  StorageReadV1_request,
  StorageReadV1_response,
  StorageWriteV1_request,
  StorageWriteV1_response,
} from './v1/storage.js';

const createRequest = <Name extends string, Request, Response>(
  key: Name,
  request: Codec<Request>,
  response: Codec<Response>,
) => {
  return {
    [`${key}_request`]: request,
    [`${key}_response`]: response,
  } as Record<`${Name}_request`, Codec<Request>> & Record<`${Name}_response`, Codec<Response>>;
};

const createSubscription = <Name extends string, Start, Receive>(
  key: Name,
  start: Codec<Start>,
  receive: Codec<Receive>,
) => {
  return {
    [`${key}_start`]: start,
    [`${key}_stop`]: _void,
    [`${key}_receive`]: receive,
  } as Record<`${Name}_start`, Codec<Start>> &
    Record<`${Name}_stop`, Codec<undefined>> &
    Record<`${Name}_receive`, Codec<Receive>>;
};

export type MessagePayloadV1Schema = CodecType<typeof MessagePayloadV1>;
export const MessagePayloadV1 = Enum({
  // host requests

  ...createRequest('handshake', HandshakeV1_request, HandshakeV1_response),
  ...createRequest('feature', FeatureV1_request, FeatureV1_response),
  ...createRequest('permission_request', PermissionRequestV1_request, PermissionRequestV1_response),

  // storage

  ...createRequest('storage_read', StorageReadV1_request, StorageReadV1_response),
  ...createRequest('storage_write', StorageWriteV1_request, StorageWriteV1_response),
  ...createRequest('storage_clear', StorageClearV1_request, StorageClearV1_response),

  // TODO accounts

  // signing

  ...createRequest('create_transaction', CreateTransactionV1_request, CreateTransactionV1_response),
  ...createRequest('sign_raw', SignRawV1_request, SignRawV1_response),
  ...createRequest('sign_payload', SignPayloadV1_request, SignPayloadV1_response),

  // chat

  ...createRequest('chat_create_contact', ChatCreateContactV1_request, ChatCreateContactV1_response),
  ...createRequest('chat_post_message', ChatPostMessageV1_request, ChatPostMessageV1_response),
  ...createSubscription('chat_action_subscribe', ChatActionSubscribeV1_start, ChatActionSubscribeV1_receive),

  // statement store

  ...createRequest('statement_store_query', StatementStoreQueryV1_request, StatementStoreQueryV1_response),
  ...createSubscription(
    'statement_store_subscribe',
    StatementStoreSubscribeV1_start,
    StatementStoreSubscribeV1_receive,
  ),
  ...createRequest(
    'statement_store_create_proof',
    StatementStoreCreateProofV1_request,
    StatementStoreCreateProofV1_response,
  ),
  ...createRequest('statement_store_submit', StatementStoreSubmitV1_request, StatementStoreSubmitV1_response),

  // json rpc

  ...createRequest('jsonrpc_message_send', JsonRpcMessageSendV1_request, JsonRpcMessageSendV1_response),
  ...createSubscription(
    'jsonrpc_message_subscribe',
    JsonRpcMessageSubscribeV1_start,
    JsonRpcMessageSubscribeV1_receive,
  ),
});

export type MessagePayloadSchema = CodecType<typeof MessagePayload>;
export const MessagePayload = Enum({
  v1: MessagePayloadV1,
});

export type MessageSchema = CodecType<typeof Message>;
export const Message = Struct({
  requestId: str,
  payload: MessagePayload,
});

export type MessageVersion = MessagePayloadSchema['tag'];
export type MessageActionByVersion<V extends MessageVersion> = PickMessagePayloadByVersion<V>['tag'];

type PickMessagePayloadByVersion<V extends MessageVersion> = Extract<MessagePayloadSchema, { tag: V }>['value'];

export type PickMessagePayload<V extends MessageVersion, Action extends MessageActionByVersion<V>> = Extract<
  PickMessagePayloadByVersion<V>,
  { tag: Action }
>;

export type PickMessagePayloadValue<
  V extends MessageVersion,
  Action extends MessageActionByVersion<V>,
> = PickMessagePayload<V, Action>['value'];

export type ComposeMessageAction<V extends MessageVersion, Method extends string, Action extends string> =
  `${Method}_${Action}` extends MessageActionByVersion<V> ? `${Method}_${Action}` : never;
