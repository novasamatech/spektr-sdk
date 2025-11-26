import { fromHex, toHex } from '@polkadot-api/utils';
import type { Codec } from 'scale-ts';
import { Bytes, Enum, str } from 'scale-ts';

import { createTransportEncoder } from './createTransportEncoder';
import type { HexString } from './types';

export const hexEncoder = createTransportEncoder<HexString, Codec<Uint8Array>>({
  codec: Bytes(),
  from: v => toHex(v) as HexString,
  to: fromHex,
});

export function responseEncoder<T>(codec: Codec<T>) {
  return Enum({
    success: codec,
    error: str,
  });
}
