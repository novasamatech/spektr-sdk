import { gcm } from '@noble/ciphers/aes.js';
import { p256 } from '@noble/curves/nist.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import {
  HDKD as sr25519HDKD,
  getPublicKey as sr25519GetPublicKey,
  secretFromSeed as sr25519SecretFromSeed,
  sign as sr25519Sign,
} from '@scure/sr25519';
import type { Codec } from 'scale-ts';
import { Bytes, str, u32 } from 'scale-ts';

import type { Branded } from '../types.js';

// types

export type SsPublicKey = Branded<Uint8Array, 'SsPublicKey'>;
export type SsSecret = Branded<Uint8Array, 'SsSecret'>;

export type EncrPublicKey = Branded<Uint8Array, 'EncrPublicKey'>;
export type EncrSecret = Branded<Uint8Array, 'EncrSecret'>;
export type SharedSecret = Branded<Uint8Array, 'SharedSecret'>;

export type SharedSession = Branded<Uint8Array, 'SharedSession'>;

// schemas

function brandedBytesCodec<T extends Uint8Array>(length?: number) {
  return Bytes(length) as unknown as Codec<T>;
}

export const SsPubKey = brandedBytesCodec<SsPublicKey>(32);
export const EncrPubKey = brandedBytesCodec<EncrPublicKey>(65);

// helpers

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function stringToBytes(str: string) {
  return textEncoder.encode(str);
}

export function bytesToString(bytes: Uint8Array) {
  return textDecoder.decode(bytes);
}

export function mergeBytes(...bytes: Uint8Array[]) {
  const len = bytes.reduce((l, b) => l + b.length, 0);
  const merged = new Uint8Array(len);

  let offset = 0;
  for (const arr of bytes) {
    merged.set(arr, offset);
    offset += arr.length;
  }

  return merged;
}

// statement store key pair

export const SS_SECRET_SEED_SIZE = 32;

export function createSsSecret(seed: Uint8Array) {
  return sr25519SecretFromSeed(seed) as SsSecret;
}

export function createSsHardDerivation(secret: SsSecret, derivation: string | number) {
  const chainCode = new Uint8Array(32);
  chainCode.set(typeof derivation === 'string' ? str.enc(derivation) : u32.enc(derivation));

  return sr25519HDKD.secretHard(secret, chainCode) as SsSecret;
}

export function getSsPub(secret: SsSecret) {
  return sr25519GetPublicKey(secret) as SsPublicKey;
}

export function signWithSsSecret(secret: SsSecret, message: Uint8Array) {
  return sr25519Sign(secret, message);
}

// encryption key pair

export const ENCR_SECRET_SEED_SIZE = 48;

export function createEncrSecret(seed: Uint8Array) {
  const { secretKey } = p256.keygen(seed);
  return secretKey as EncrSecret;
}

export function getEncrPub(secret: EncrSecret) {
  return p256.getPublicKey(secret, false) as EncrPublicKey;
}

// helpers

export function createRandomSeed(suffix: string, size: number) {
  return blake2b(mergeBytes(randomBytes(128), stringToBytes(suffix)), { dkLen: size });
}

export function createStableSeed(value: string, size: number) {
  return blake2b(stringToBytes(value), { dkLen: size });
}

export function khash(secret: Uint8Array, message: Uint8Array) {
  return blake2b(message, { dkLen: 256 / 8, key: secret });
}

export function createSharedSecret(secret: EncrSecret, publicKey: Uint8Array) {
  return p256.getSharedSecret(secret, publicKey).slice(1, 33) as SharedSecret;
}

export function encrypt(secret: Uint8Array, cipherText: Uint8Array) {
  const nonce = randomBytes(12);
  const aesKey = hkdf(sha256, secret, new Uint8Array(), new Uint8Array(), 32);
  const aes = gcm(aesKey, nonce);
  return aes.encrypt(mergeBytes(nonce, cipherText));
}

export function decrypt(secret: Uint8Array, message: Uint8Array) {
  const nonce = message.slice(0, 12);
  const cipherText = message.slice(12);

  const aesKey = hkdf(sha256, secret, new Uint8Array(), new Uint8Array(), 32);
  const aes = gcm(aesKey, nonce);
  return aes.decrypt(cipherText);
}
