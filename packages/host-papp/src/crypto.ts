import { p256 } from '@noble/curves/nist.js';
import { randomBytes } from '@noble/hashes/utils.js';
import {
  HDKD as sr25519HDKD,
  getPublicKey as sr25519GetPublicKey,
  secretFromSeed as sr25519SecretFromSeed,
  sign as sr25519Sign,
  verify as sr25519Verify,
} from '@scure/sr25519';
import type { Codec } from 'scale-ts';
import { Bytes, str, u32 } from 'scale-ts';

import type { Branded } from './types.js';

// types

export type SsPublicKey = Branded<Uint8Array, 'SsPublicKey'>;
export type SsSecret = Branded<Uint8Array, 'SsSecret'>;

export type EncrPublicKey = Branded<Uint8Array, 'EncrPublicKey'>;
export type EncrSecret = Branded<Uint8Array, 'EncrSecret'>;
export type SharedSecret = Branded<Uint8Array, 'SharedSecret'>;

export type SharedSession = Branded<Uint8Array, 'SharedSession'>;

// schemas

export function BrandedBytesCodec<T extends Uint8Array>(length?: number) {
  return Bytes(length) as unknown as Codec<T>;
}

export const SsPubKey = BrandedBytesCodec<SsPublicKey>(32);
export const EncrPubKey = BrandedBytesCodec<EncrPublicKey>(65);

// helpers

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function stringToBytes(str: string) {
  return textEncoder.encode(str);
}

export function bytesToString(bytes: Uint8Array) {
  return textDecoder.decode(bytes);
}

// statement store key pair

export const SS_SECRET_SEED_SIZE = 32;

export function createSsSecret(seed: Uint8Array = randomBytes(SS_SECRET_SEED_SIZE)) {
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

export function verifyWithSsSecret(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) {
  return sr25519Verify(message, signature, publicKey);
}

// encryption key pair

export const ENCR_SECRET_SEED_SIZE = 48;

export function createEncrSecret(seed: Uint8Array = randomBytes(ENCR_SECRET_SEED_SIZE)) {
  const { secretKey } = p256.keygen(seed);
  return secretKey as EncrSecret;
}

export function getEncrPub(secret: EncrSecret) {
  return p256.getPublicKey(secret, false) as EncrPublicKey;
}

export function createSharedSecret(secret: EncrSecret, publicKey: Uint8Array) {
  // slicing first byte: @noble/curves adds y offset at the start
  return p256.getSharedSecret(secret, publicKey).slice(1, 33) as SharedSecret;
}
