import { Enum, str, Struct, type CodecType, type Codec } from 'scale-ts';
import { getAccountsResponseV1Encoder, getAccountsRequestV1Encoder } from './interactions/accounts';
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
  papiProviderSendMessageV1: papiProviderSendMessageV1Encoder,
  papiProviderReceiveMessageV1: responseEncoder(papiProviderReceiveMessageV1Encoder),
  signRawRequestV1: signRawRequestV1Encoder,
  signPayloadRequestV1: signPayloadRequestV1Encoder,
  signPayloadResponseV1: responseEncoder(signResponseV1Encoder),
});

export type MessageSchema = CodecType<typeof messageEncoder>;
export const messageEncoder = Struct({
  id: str,
  payload: messagePayloadEncoder,
});

export type MessageType = MessagePayloadSchema['tag'];

export type PickMessagePayload<T extends MessageType> = Extract<MessagePayloadSchema, { tag: T }>;
