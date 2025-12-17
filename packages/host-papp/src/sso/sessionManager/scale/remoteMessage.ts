import { Enum, Struct, _void, str } from 'scale-ts';

export const HostRemoteMessageDataCodec = Enum({
  v1: Enum({
    Disconnected: _void,
    // TODO implement
    // SigningRequest: Bytes(),
    // TODO implement
    // SigningResponse: Bytes(),
  }),
});

export const HostRemoteMessageCodec = Struct({
  messageId: str,
  data: HostRemoteMessageDataCodec,
});
