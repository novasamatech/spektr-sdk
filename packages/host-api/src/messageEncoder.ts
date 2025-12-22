import type { CodecType } from 'scale-ts';
import { Enum, Struct, str } from 'scale-ts';

import { Result } from './commonEncoders.js';
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

export function unwrapResultOrThrow<T>(response: CodecType<ReturnType<typeof Result<T>>>) {
  switch (response.tag) {
    case 'Ok':
      return response.value;
    case 'Err':
      throw new Error(response.value);
  }
}

export type MessagePayloadSchema = CodecType<typeof messagePayloadEncoder>;
export const messagePayloadEncoder = Enum({
  handshakeRequestV1: handshakeRequestV1Encoder,
  handshakeResponseV1: Result(handshakeResponseV1Encoder),

  getAccountsRequestV1: getAccountsRequestV1Encoder,
  getAccountsResponseV1: Result(getAccountsResponseV1Encoder),
  accountSubscriptionV1: accountSubscriptionV1Encoder,
  accountUnsubscriptionV1: accountUnsubscriptionV1Encoder,

  supportFeatureRequestV1: supportFeatureRequestV1Encoder,
  supportFeatureResponseV1: Result(supportFeatureResponseV1),

  papiProviderSendMessageV1: papiProviderSendMessageV1Encoder,
  papiProviderReceiveMessageV1: Result(papiProviderReceiveMessageV1Encoder),

  signRawRequestV1: signRawRequestV1Encoder,
  signPayloadRequestV1: signPayloadRequestV1Encoder,
  signResponseV1: Result(signResponseV1Encoder),
  createTransactionRequestV1: createTransactionRequestV1Encoder,
  createTransactionResponseV1: Result(createTransactionResponseV1Encoder),

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
