import type { Codec, CodecType, StringRecord } from 'scale-ts';
import { Bytes, Enum as ScaleEnum, Option, Struct, _void, enhanceCodec, str } from 'scale-ts';

import { fromHex, toHex } from '../helpers.js';

import type { HexString } from './types.js';

type FilterStringRecord<T extends Record<string, Codec<any>>> = T extends StringRecord<Codec<any>> ? T : never;

export type EnumCodec<T extends Record<string, Codec<any>>> = ReturnType<typeof Enum<T>>;
export const Enum = <T extends Record<string, Codec<any>>>(inner: T) => ScaleEnum(inner as FilterStringRecord<T>);

export function Nullable<T>(inner: Codec<T>) {
  return enhanceCodec<T | undefined, T | null>(
    Option(inner),
    v => (v === null ? undefined : v),
    v => (v === undefined ? null : v),
  );
}

type Constructor<A extends Array<any>, T> = new (...args: A) => T;
type CodecError<T, Name extends string> = Error & { name: Name; payload: T };
type CodecErrorConstructor<T, Name extends string> = Constructor<[T], CodecError<T, Name>>;
export type ErrCodec<T, Name extends string> = Codec<CodecError<T, Name>> & CodecErrorConstructor<T, Name>;
export function Err<const T, const Name extends string>(
  name: Name,
  value: Codec<T>,
  message: string | ((value: NoInfer<T>) => string),
): ErrCodec<T, Name> {
  // Defining class with dynamic name
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const C: CodecErrorConstructor<T, Name> = {
    [name]: class extends Error {
      public readonly name = name;
      public readonly payload: T;
      constructor(data: T) {
        super(typeof message === 'function' ? message(data) : message);
        this.payload = data;
      }
      // workaround for codec array destructuring
      static [Symbol.iterator]() {
        return errorCodec[Symbol.iterator]();
      }
    },
  }[name]!;

  const errorCodec = enhanceCodec<T, InstanceType<typeof C>>(
    value,
    v => v.payload,
    v => new C(v),
  );

  return Object.assign(C, errorCodec);
}

type MapErrEnum<T extends Record<string, ErrEnumArguments<any>>> = {
  [K in keyof T]: ErrCodec<CodecType<T[K][0]>, K extends string ? K : ''>;
};

type ErrEnumInput<T extends Record<string, ErrEnumArguments<any>>> = {
  [K in keyof T]: CodecError<CodecType<T[K][0]>, K extends string ? K : ''>;
}[keyof T];

type ErrEnumArguments<T> = [value: Codec<T>, message: string | ((value: T) => string)];

export function ErrEnum<const T extends Record<string, ErrEnumArguments<any>>>(
  inner: T,
): Codec<ErrEnumInput<T>> & MapErrEnum<T> {
  const values = Object.fromEntries(
    Object.entries(inner).map(([k, [value, message]]) => {
      return [k, Err(k, value, message)];
    }),
  ) as never as MapErrEnum<T>;

  const codec = enhanceCodec<CodecType<EnumCodec<MapErrEnum<T>>>, ErrEnumInput<T>>(
    Enum(values),
    v => ({ tag: v.name, value: v }) as any,
    v => v.value as ErrEnumInput<T>,
  );

  return Object.assign(codec, values);
}

/**
 * Wrapper around Bytes codec. Every usage of Hex codec should be threaded as raw Bytes with mapping to hex string.
 * @param [length] Optional, corresponds to byte array size, not the length of hex string.
 */
export const Hex = (length?: number) => enhanceCodec<Uint8Array, HexString>(Bytes(length), fromHex, toHex);

export const GenesisHash = Hex();

export const GenericErr = Struct({
  reason: str,
});

export const GenericError = Err('GenericError', GenericErr, ({ reason }) => `Unknown error: ${reason}`);
