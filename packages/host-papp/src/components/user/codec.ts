import { Bytes, Enum, Struct, _void, str } from 'scale-ts';

export const HostRemoteMessageCodec = Struct({
  messageId: str,
  data: Enum({
    v1: Enum({
      Disconnected: _void,
      // TODO implement
      SigningRequest: Bytes(),
      // TODO implement
      SigningResponse: Bytes(),
    }),
  }),
});
