import { Result, bool } from 'scale-ts';

import { Enum, GenericError, Hex } from '../commonCodecs.js';

export const Feature = Enum({
  chain: Hex(),
});

export const FeatureV1_request = Feature;
export const FeatureV1_response = Result(bool, GenericError);
