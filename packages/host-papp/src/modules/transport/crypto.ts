import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { mergeUint8 } from '@polkadot-api/utils';

export function encrypt(secret: Uint8Array, cipherText: Uint8Array) {
  const nonce = randomBytes(12);
  const aesKey = hkdf(sha256, secret, new Uint8Array(), new Uint8Array(), 32);
  const aes = gcm(aesKey, nonce);
  return aes.encrypt(mergeUint8(nonce, cipherText));
}

export function decrypt(secret: Uint8Array, message: Uint8Array) {
  const nonce = message.slice(0, 12);
  const cipherText = message.slice(12);

  const aesKey = hkdf(sha256, secret, new Uint8Array(), new Uint8Array(), 32);
  const aes = gcm(aesKey, nonce);
  return aes.decrypt(cipherText);
}
