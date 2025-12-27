import { fromHex, toHex } from '@polkadot-api/utils';
import type { Codec } from 'scale-ts';
import { Bytes, Option, Struct, enhanceCodec, str } from 'scale-ts';

import type { HexString } from './types.js';

export const Nullable = <T>(inner: Codec<T>) =>
  enhanceCodec<T | undefined, T | null>(
    Option(inner),
    v => (v === null ? undefined : v),
    v => (v === undefined ? null : v),
  );

export const Hex = (length?: number) =>
  enhanceCodec<Uint8Array, HexString>(Bytes(length), fromHex, v => toHex(v) as HexString);

export const GenericErr = Struct({
  reason: str,
});

export const GenesisHash = Hex();
