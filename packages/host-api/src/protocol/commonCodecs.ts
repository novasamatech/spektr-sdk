import type { Codec, StringRecord } from 'scale-ts';
import { Bytes, Enum as ScaleEnum, Option, Struct, enhanceCodec, str } from 'scale-ts';

import { fromHex, toHex } from '../helpers.js';

import type { HexString } from './types.js';

type FilterStringRecord<T extends Record<string, Codec<any>>> = T extends StringRecord<Codec<any>> ? T : never;

export type EnumCodec<T extends Record<string, Codec<any>>> = ReturnType<typeof Enum<T>>;
export const Enum = <T extends Record<string, Codec<any>>>(inner: T) => ScaleEnum(inner as FilterStringRecord<T>);

export const Nullable = <T>(inner: Codec<T>) =>
  enhanceCodec<T | undefined, T | null>(
    Option(inner),
    v => (v === null ? undefined : v),
    v => (v === undefined ? null : v),
  );

export const Hex = (length?: number) => enhanceCodec<Uint8Array, HexString>(Bytes(length), fromHex, toHex);

export const GenesisHash = Hex();

export const GenericErr = Struct({
  reason: str,
});

export class GenericError extends Error {
  constructor(reason: string) {
    super(reason);
  }
}
