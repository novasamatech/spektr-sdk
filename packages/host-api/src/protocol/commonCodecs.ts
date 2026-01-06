import type { Codec, CodecType, StringRecord } from 'scale-ts';
import { Bytes, Enum as ScaleEnum, Option, Struct, _void, enhanceCodec, str, u8 } from 'scale-ts';

import { fromHex, toHex } from '../helpers.js';

import type { HexString } from './types.js';

type FilterStringRecord<T extends Record<string, Codec<any>>> = T extends StringRecord<Codec<any>> ? T : never;

export type EnumCodec<T extends Record<string, Codec<any>>> = ReturnType<typeof Enum<T>>;
export const Enum = <T extends Record<string, Codec<any>>>(inner: T) => ScaleEnum(inner as FilterStringRecord<T>);

/**
 * Enum without values
 */
export function Status<T extends string>(...list: T[]) {
  return enhanceCodec<number, T>(
    u8,
    v => {
      const i = list.indexOf(v);
      if (i === -1) {
        throw new Error(`Unknown status value: ${v}`);
      }
      return i;
    },
    i => {
      const v = list.at(i);
      if (v === undefined) {
        throw new Error(`Unknown status index: ${i}`);
      }
      return v;
    },
  );
}

export function Nullable<T>(inner: Codec<T>) {
  return enhanceCodec<T | undefined, T | null>(
    Option(inner),
    v => (v === null ? undefined : v),
    v => (v === undefined ? null : v),
  );
}

type Constructor<A extends Array<any>, T> = new (...args: A) => T;
type CodecError<T, Name extends string> = Error & { name: Name; className: string; payload: T };
type CodecErrorConstructor<T, Name extends string> = Constructor<
  T extends undefined ? [void] : [T],
  CodecError<T, Name>
>;
export type ErrCodec<T, Name extends string> = Codec<CodecError<T, Name>> & CodecErrorConstructor<T, Name>;
export function Err<const T, const Name extends string>(
  name: Name,
  value: Codec<T>,
  message: string | ((value: NoInfer<T>) => string),
  className: string = name,
): ErrCodec<T, Name> {
  // Defining class with dynamic name
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const C: CodecErrorConstructor<T, Name> = {
    [className]: class extends Error {
      public readonly className = className;
      public readonly name = name;
      public readonly payload: T;
      constructor(data: any) {
        super(typeof message === 'function' ? message(data) : message);
        this.payload = data;
      }
      // workaround for codec array destructuring
      static [Symbol.iterator]() {
        return errorCodec[Symbol.iterator]();
      }
    },
  }[className]!;

  const errorCodec = enhanceCodec<T, InstanceType<typeof C>>(
    value,
    v => v.payload,
    // @ts-expect-error don't want to fix it really
    v => new C(v as any),
  );

  return Object.assign(C, errorCodec);
}

type MapErrEnum<Name extends string, T extends Record<string, ErrEnumArguments<any>>> = {
  [K in keyof T]: ErrCodec<CodecType<T[K][0]>, K extends string ? `${Name}::${K}` : Name>;
};

type ErrEnumInput<Name extends string, T extends Record<string, ErrEnumArguments<any>>> = {
  [K in keyof T]: CodecError<CodecType<T[K][0]>, K extends string ? `${Name}::${K}` : Name>;
}[keyof T];

type ErrEnumArguments<T> = [value: Codec<T>, message: string | ((value: T) => string)];

export function ErrEnum<const Name extends string, const T extends Record<string, ErrEnumArguments<any>>>(
  name: Name,
  inner: T,
): Codec<ErrEnumInput<Name, T>> & MapErrEnum<Name, T> {
  const values = Object.fromEntries(
    Object.entries(inner).map(([k, [value, message]]) => {
      return [k, Err(`${name}::${k}`, value, message, k)];
    }),
  ) as never as MapErrEnum<Name, T>;

  const codec = enhanceCodec<CodecType<EnumCodec<MapErrEnum<Name, T>>>, ErrEnumInput<Name, T>>(
    Enum(values),
    v => ({ tag: v.className, value: v }) as any,
    v => v.value as ErrEnumInput<Name, T>,
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
