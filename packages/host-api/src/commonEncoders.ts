import { fromHex, toHex } from '@polkadot-api/utils';
import type { Codec } from 'scale-ts';
import { Bytes } from 'scale-ts';

import { createTransportEncoder } from './createTransportEncoder.js';
import type { HexString } from './types.js';

export const hexCodec = createTransportEncoder<HexString, Codec<Uint8Array>>({
  codec: Bytes(),
  from: v => toHex(v) as HexString,
  to: fromHex,
});
