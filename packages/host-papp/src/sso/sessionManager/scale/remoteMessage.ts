import { Bytes, Enum, Struct, _void, str } from 'scale-ts';

export const RemoteMessageDataCodec = Enum({
  v1: Enum({
    Disconnected: _void,
    // TODO implement
    SigningRequest: Bytes(),
    // TODO implement
    // SigningResponse: Bytes(),
  }),
});

export const RemoteMessageCodec = Struct({
  messageId: str,
  data: RemoteMessageDataCodec,
});
