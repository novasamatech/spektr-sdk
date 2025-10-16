import { Enum, Struct, bool } from 'scale-ts';
import { hexEncoder } from '../commonEncoders';

export const supportFeatureRequestV1Encoder = Enum({
  chain: Struct({
    chainId: hexEncoder,
  }),
});

export const supportFeatureResponseV1 = Enum({
  chain: Struct({
    chainId: hexEncoder,
    result: bool,
  }),
});
