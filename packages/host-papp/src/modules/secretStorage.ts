import { gcm } from '@noble/ciphers/aes.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { fromHex, toHex } from '@polkadot-api/utils';
import type { ResultAsync } from 'neverthrow';

import type { StorageAdapter } from '../adapters/storage/types.js';

import type { EncrSecret, SsSecret } from './crypto.js';
import { stringToBytes } from './crypto.js';

export type SecretStorage = {
  readSsSecret(accountId: string): ResultAsync<SsSecret | null, Error>;
  writeSsSecret(accountId: string, value: SsSecret): ResultAsync<void, Error>;
  clearSsSecret(accountId: string): ResultAsync<void, Error>;
  readEncrSecret(accountId: string): ResultAsync<EncrSecret | null, Error>;
  writeEncrSecret(accountId: string, value: EncrSecret): ResultAsync<void, Error>;
  clearEncrSecret(accountId: string): ResultAsync<void, Error>;
};

export function createSecretStorage(appId: string, storage: StorageAdapter): SecretStorage {
  const ssSecret = rwBytes<SsSecret>('SsSecret', appId, storage);
  const encrSecret = rwBytes<EncrSecret>('EncrSecret', appId, storage);

  return {
    readSsSecret: ssSecret.read,
    writeSsSecret: ssSecret.write,
    clearSsSecret: ssSecret.clear,
    readEncrSecret: encrSecret.read,
    writeEncrSecret: encrSecret.write,
    clearEncrSecret: encrSecret.clear,
  };
}

const createKey = (key: string, context: string) => `${key}_${context}`;

const rwBytes = <T extends Uint8Array>(baseKey: string, appId: string, storage: StorageAdapter) => ({
  read(context: string): ResultAsync<T | null, Error> {
    return storage.read(createKey(baseKey, context)).map(value => {
      if (value) {
        const aes = getAes(appId);
        return aes.decrypt(fromHex(value)) as T;
      } else {
        return null;
      }
    });
  },
  write(context: string, value: T) {
    const aes = getAes(appId);
    return storage.write(createKey(baseKey, context), toHex(aes.encrypt(value)));
  },
  clear(context: string) {
    return storage.clear(createKey(baseKey, context));
  },
});

function getAes(appId: string) {
  return gcm(blake2b(stringToBytes(appId), { dkLen: 16 }), blake2b(stringToBytes('nonce'), { dkLen: 32 }));
}
