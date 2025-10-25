import type { Codec, CodecType } from 'scale-ts';
import { Enum, Struct, str } from 'scale-ts';

import { hexEncoder } from './commonEncoders';
import {
  accountSubscriptionV1Encoder,
  accountUnsubscriptionV1Encoder,
  getAccountsRequestV1Encoder,
  getAccountsResponseV1Encoder,
} from './interactions/accounts';
import { supportFeatureRequestV1Encoder, supportFeatureResponseV1 } from './interactions/features';
import { handshakeRequestV1Encoder, handshakeResponseV1Encoder } from './interactions/handshake';
import { papiProviderReceiveMessageV1Encoder, papiProviderSendMessageV1Encoder } from './interactions/papiProvider';
import { signPayloadRequestV1Encoder, signRawRequestV1Encoder, signResponseV1Encoder } from './interactions/sign';

function responseEncoder<T>(codec: Codec<T>) {
  return Enum({
    success: codec,
    error: str,
  });
}

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

  supportChainRequestV1: Struct({
    chainId: hexEncoder,
  }),

  papiProviderSendMessageV1: papiProviderSendMessageV1Encoder,
  papiProviderReceiveMessageV1: responseEncoder(papiProviderReceiveMessageV1Encoder),

  signRawRequestV1: signRawRequestV1Encoder,
  signPayloadRequestV1: signPayloadRequestV1Encoder,
  signResponseV1: responseEncoder(signResponseV1Encoder),

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
