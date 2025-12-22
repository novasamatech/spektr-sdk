import { Enum, Struct, bool } from 'scale-ts';

import { hexCodec } from '../commonEncoders.js';

export const supportFeatureRequestV1Encoder = Enum({
  chain: Struct({
    chainId: hexCodec,
  }),
});

export const supportFeatureResponseV1 = Enum({
  chain: Struct({
    chainId: hexCodec,
    result: bool,
  }),
});
