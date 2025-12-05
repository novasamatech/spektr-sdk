import type { CodecType } from 'scale-ts';
import { Enum, Struct, str } from 'scale-ts';

import { responseEncoder } from './commonEncoders.js';
import {
  accountSubscriptionV1Encoder,
  accountUnsubscriptionV1Encoder,
  getAccountsRequestV1Encoder,
  getAccountsResponseV1Encoder,
} from './interactions/accounts.js';
import { supportFeatureRequestV1Encoder, supportFeatureResponseV1 } from './interactions/features.js';
import { handshakeRequestV1Encoder, handshakeResponseV1Encoder } from './interactions/handshake.js';
import { papiProviderReceiveMessageV1Encoder, papiProviderSendMessageV1Encoder } from './interactions/papiProvider.js';
import {
  createTransactionRequestV1Encoder,
  createTransactionResponseV1Encoder,
  signPayloadRequestV1Encoder,
  signRawRequestV1Encoder,
  signResponseV1Encoder,
} from './interactions/sign.js';

export function unwrapResponseOrThrow<T>(response: CodecType<ReturnType<typeof responseEncoder<T>>>) {
  if (response.tag === 'success') {
    return response.value;
  } else {
    throw new Error(response.value);
  }
}

export type MessagePayloadSchema = CodecType<typeof messagePayloadEncoder>;
export const messagePayloadEncoder = Enum({
  handshakeRequestV1: handshakeRequestV1Encoder,
  handshakeResponseV1: responseEncoder(handshakeResponseV1Encoder),

  getAccountsRequestV1: getAccountsRequestV1Encoder,
  getAccountsResponseV1: responseEncoder(getAccountsResponseV1Encoder),
  accountSubscriptionV1: accountSubscriptionV1Encoder,
  accountUnsubscriptionV1: accountUnsubscriptionV1Encoder,

  supportFeatureRequestV1: supportFeatureRequestV1Encoder,
  supportFeatureResponseV1: responseEncoder(supportFeatureResponseV1),

  papiProviderSendMessageV1: papiProviderSendMessageV1Encoder,
  papiProviderReceiveMessageV1: responseEncoder(papiProviderReceiveMessageV1Encoder),

  signRawRequestV1: signRawRequestV1Encoder,
  signPayloadRequestV1: signPayloadRequestV1Encoder,
  signResponseV1: responseEncoder(signResponseV1Encoder),
  createTransactionRequestV1: createTransactionRequestV1Encoder,
  createTransactionResponseV1: responseEncoder(createTransactionResponseV1Encoder),

  locationChangedV1: str,
});

export type MessageSchema = CodecType<typeof messageEncoder>;
export const messageEncoder = Struct({
  id: str,
  payload: messagePayloadEncoder,
});

export type MessageType = MessagePayloadSchema['tag'];

export type PickMessagePayload<T extends MessageType> = Extract<MessagePayloadSchema, { tag: T }>;
export type PickMessagePayloadValue<T extends MessageType> = PickMessagePayload<T>['value'];
