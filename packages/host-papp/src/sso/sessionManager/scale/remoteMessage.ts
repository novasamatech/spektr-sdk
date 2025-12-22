import { Enum, Struct, _void, str } from 'scale-ts';

import { SignPayloadRequestCodec } from './signPayloadRequest.js';
import { SignPayloadResponseCodec } from './signPayloadResponse.js';

export const RemoteMessageCodec = Struct({
  messageId: str,
  data: Enum({
    v1: Enum({
      Disconnected: _void,
      SignRequest: SignPayloadRequestCodec,
      SignResponse: SignPayloadResponseCodec,
    }),
  }),
});
