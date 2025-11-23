import type { HexString } from '@novasamatech/spektr-sdk-shared';
import type { Codec } from 'scale-ts';
import { Enum, _void, str } from 'scale-ts';

import { createTransportEncoder } from './createTransportEncoder';

function isHex(value: string): value is HexString {
  return value.startsWith('0x');
}

export const hexEncoder = createTransportEncoder<HexString, typeof str>({
  codec: str,
  from: v => {
    if (isHex(v)) {
      return v;
    }
    throw new Error('Value is not a hex');
  },
  to: hex => hex,
});

export function responseEncoder<T>(codec: Codec<T>) {
  return Enum({
    success: codec,
    error: str,
  });
}

export function createNullableEncoder<T>(codec: Codec<T>) {
  return Enum({
    value: codec,
    null: _void,
  });
}
