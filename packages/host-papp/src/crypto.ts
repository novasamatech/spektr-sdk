import { p256 } from '@noble/curves/nist.js';
import { entropyToMiniSecret, mnemonicToEntropy } from '@polkadot-labs/hdkd-helpers';
import {
  HDKD as sr25519HDKD,
  getPublicKey as sr25519GetPublicKey,
  secretFromSeed as sr25519SecretFromSeed,
  sign as sr25519Sign,
  verify as sr25519Verify,
} from '@scure/sr25519';
import type { Codec } from 'scale-ts';
import { Bytes, str } from 'scale-ts';

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

function parseDerivations(derivationsStr: string) {
  const DERIVATION_RE = /(\/{1,2})([^/]+)/g;

  const derivations = [] as [type: 'hard' | 'soft', code: string][];
  for (const [, type, code] of derivationsStr.matchAll(DERIVATION_RE)) {
    if (code) {
      derivations.push([type === '//' ? 'hard' : 'soft', code]);
    }
  }
  return derivations;
}

function createChainCode(derivation: string) {
  const chainCode = new Uint8Array(32);
  chainCode.set(str.enc(derivation));
  return chainCode;
}

// statement store key pair

export function createSsSecret(entropy: Uint8Array): SsSecret {
  const miniSecret = entropyToMiniSecret(entropy);
  return sr25519SecretFromSeed(miniSecret) as SsSecret;
}

export function createSsDerivation(secret: SsSecret, derivation: string) {
  const derivations = parseDerivations(derivation);

  return derivations.reduce((secret, [type, derivation]) => {
    const chainCode = createChainCode(derivation);

    switch (type) {
      case 'hard':
        return sr25519HDKD.secretHard(secret, chainCode) as SsSecret;

      case 'soft':
        return sr25519HDKD.secretSoft(secret, chainCode) as SsSecret;
    }
  }, secret);
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

export type DerivedSr25519Account = {
  secret: SsSecret;
  publicKey: SsPublicKey;
  entropy: Uint8Array;
  sign(message: Uint8Array): Uint8Array;
  verify(message: Uint8Array, signature: Uint8Array): boolean;
};

export function deriveSr25519Account(mnemonic: string, derivation: string): DerivedSr25519Account {
  const entropy = mnemonicToEntropy(mnemonic);
  const secret = createSsDerivation(createSsSecret(entropy), derivation);
  const publicKey = getSsPub(secret);

  return {
    secret,
    publicKey,
    entropy,
    sign: message => signWithSsSecret(secret, message),
    verify: (message, signature) => verifyWithSsSecret(message, signature, publicKey),
  };
}

// encryption key pair

export function createEncrSecret(entropy: Uint8Array) {
  const miniSecret = entropyToMiniSecret(entropy);
  const seed = new Uint8Array(48);
  seed.set(miniSecret);
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
