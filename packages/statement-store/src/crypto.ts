import { blake2b } from '@noble/hashes/blake2.js';
import type { Codec } from 'scale-ts';
import { Bytes } from 'scale-ts';

export function BrandedBytesCodec<T extends Uint8Array>(length?: number) {
  return Bytes(length) as unknown as Codec<T>;
}

// helpers

const textEncoder = new TextEncoder();

export function stringToBytes(str: string) {
  return textEncoder.encode(str);
}

/**
 * blake2b_256 with key
 */
export function khash(secret: Uint8Array, message: Uint8Array) {
  return blake2b(message, { dkLen: 32, key: secret });
}
