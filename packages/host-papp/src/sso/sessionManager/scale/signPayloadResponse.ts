import type { CodecType } from 'scale-ts';
import { Bytes, Option, Struct, str } from 'scale-ts';

export type SignPayloadResponse = CodecType<typeof SignPayloadResponseCodec>;
export const SignPayloadResponseCodec = Struct({
  // referencing to RemoteMessage.messageId
  respondingTo: str,
  payload: Struct({
    signature: Bytes(),
    signedTransaction: Option(Bytes()),
  }),
});
