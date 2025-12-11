import { gcm } from '@noble/ciphers/aes.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { fromHex, toHex } from '@polkadot-api/utils';

import type { StorageAdapter } from '../adapters/storage/types.js';
import type { Result } from '../helpers/result.js';
import type { SessionTopic } from '../types.js';

import type { EncrSecret, SsSecret } from './crypto.js';
import { stringToBytes } from './crypto.js';

export type SecretStorage = {
  readSsSecret(): Promise<Result<SsSecret | null, Error>>;
  writeSsSecret(value: SsSecret): Promise<Result<void, Error>>;
  clearSsSecret(): Promise<Result<void, Error>>;
  readEncrSecret(): Promise<Result<EncrSecret | null, Error>>;
  writeEncrSecret(value: EncrSecret): Promise<Result<void, Error>>;
  clearEncrSecret(): Promise<Result<void, Error>>;
  readSessionTopic(accountId: string): Promise<Result<SessionTopic | null, Error>>;
  writeSessionTopic(accountId: string, value: SessionTopic): Promise<Result<void, Error>>;
  clearSessionTopic(accountId: string): Promise<Result<void, Error>>;
};

export function createSecretStorage(appId: string, storage: StorageAdapter): SecretStorage {
  const defaultContext = 'root';

  const ssSecretKey = createKey('SsSecret', appId);
  const ssEncrKey = createKey('EncrSecret', appId);
  const sessionTopicKey = createKey('SessionTopic', appId);
  // const pappAccountKey = createKey('PappAccountId', appId);

  const ssSecret = rwBytes<SsSecret>(ssSecretKey, appId, storage);
  const encrSecret = rwBytes<EncrSecret>(ssEncrKey, appId, storage);
  const sessionTopic = rwBytes<SessionTopic>(sessionTopicKey, appId, storage);
  // const pappAccountId = rwString(pappAccountKey, appId, storage);

  return {
    readSsSecret: () => ssSecret.read(defaultContext),
    writeSsSecret: value => ssSecret.write(defaultContext, value),
    clearSsSecret: () => ssSecret.clear(defaultContext),
    readEncrSecret: () => encrSecret.read(defaultContext),
    writeEncrSecret: value => encrSecret.write(defaultContext, value),
    clearEncrSecret: () => encrSecret.clear(defaultContext),
    readSessionTopic: accountId => sessionTopic.read(accountId),
    writeSessionTopic: (accountId, value) => sessionTopic.write(accountId, value),
    clearSessionTopic: accountId => sessionTopic.clear(accountId),
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

// const rwString = (key: string, appId: string, storage: StorageAdapter) => {
//   const bytes = rwBytes<Uint8Array>(key, appId, storage);
//   return {
//     async read(context: string) {
//       const value = await bytes.read(context);
//       return value ? bytesToString(value) : value;
//     },
//     write(context: string, value: string) {
//       const b = stringToBytes(value);
//       return bytes.write(context, b);
//     },
//     clear(context: string) {
//       return bytes.clear(context);
//     },
//   };
// };

function getAes(appId: string) {
  return gcm(blake2b(stringToBytes(appId), { dkLen: 16 }), blake2b(stringToBytes('nonce'), { dkLen: 32 }));
}
