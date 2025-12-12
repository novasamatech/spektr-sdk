import { gcm } from '@noble/ciphers/aes.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { fromHex, toHex } from '@polkadot-api/utils';

import type { StorageAdapter } from '../adapters/storage/types.js';
import type { SessionTopic } from '../components/user/types.js';
import type { Result } from '../helpers/result.js';

import type { EncrSecret, SsSecret } from './crypto.js';
import { stringToBytes } from './crypto.js';

export type SecretStorage = {
  readSsSecret(accountId: string): Promise<Result<SsSecret | null, Error>>;
  writeSsSecret(accountId: string, value: SsSecret): Promise<Result<void, Error>>;
  clearSsSecret(accountId: string): Promise<Result<void, Error>>;
  readEncrSecret(accountId: string): Promise<Result<EncrSecret | null, Error>>;
  writeEncrSecret(accountId: string, value: EncrSecret): Promise<Result<void, Error>>;
  clearEncrSecret(accountId: string): Promise<Result<void, Error>>;
  readSessionTopic(accountId: string): Promise<Result<SessionTopic | null, Error>>;
  writeSessionTopic(accountId: string, value: SessionTopic): Promise<Result<void, Error>>;
  clearSessionTopic(accountId: string): Promise<Result<void, Error>>;
};

export function createSecretStorage(appId: string, storage: StorageAdapter): SecretStorage {
  const ssSecret = rwBytes<SsSecret>('SsSecret', appId, storage);
  const encrSecret = rwBytes<EncrSecret>('EncrSecret', appId, storage);
  const sessionTopic = rwBytes<SessionTopic>('SessionTopic', appId, storage);

  return {
    readSsSecret: ssSecret.read,
    writeSsSecret: ssSecret.write,
    clearSsSecret: ssSecret.clear,
    readEncrSecret: encrSecret.read,
    writeEncrSecret: encrSecret.write,
    clearEncrSecret: encrSecret.clear,
    readSessionTopic: sessionTopic.read,
    writeSessionTopic: sessionTopic.write,
    clearSessionTopic: sessionTopic.clear,
  };
}

const createKey = (key: string, context: string) => `${key}_${context}`;

const rwBytes = <T extends Uint8Array>(baseKey: string, appId: string, storage: StorageAdapter) => ({
  async read(context: string): Promise<Result<T | null, Error>> {
    const result = await storage.read(createKey(baseKey, context));

    return result.map(value => {
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
