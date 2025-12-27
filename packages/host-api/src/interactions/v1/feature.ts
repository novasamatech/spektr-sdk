import { Enum, Result, bool } from 'scale-ts';

import { GenericErr, Hex } from '../commonCodecs.js';

export const Feature = Enum({
  chain: Hex,
});

export const FeatureV1_request = Feature;
export const FeatureV1_response = Result(bool, GenericErr);
