import { Struct, str } from 'scale-ts';

import { hexCodec } from '../commonEncoders.js';

export const papiProviderSendMessageV1Encoder = Struct({
  genesisHash: hexCodec,
  message: str,
});

export const papiProviderReceiveMessageV1Encoder = Struct({
  genesisHash: hexCodec,
  message: str,
});
