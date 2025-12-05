import { gcm } from '@noble/ciphers/aes.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { fromHex, toHex } from '@polkadot-api/utils';

import type { StorageAdapter } from '../adapters/storage/types.js';
import type { SessionTopic } from '../types.js';

import type { EncrSecret, SsSecret } from './crypto.js';
import { bytesToString, stringToBytes } from './crypto.js';

export type SecretStorage = {
  readSsSecret(): Promise<SsSecret | null>;
  writeSsSecret(value: SsSecret): Promise<boolean>;
  readEncrSecret(): Promise<EncrSecret | null>;
  writeEncrSecret(value: EncrSecret): Promise<boolean>;
  readSessionTopic(): Promise<SessionTopic | null>;
  writeSessionTopic(value: SessionTopic): Promise<boolean>;
  readPappAccountId(): Promise<string | null>;
  writePappAccountId(value: string): Promise<boolean>;
};

export function createSecretStorage(appId: string, storage: StorageAdapter): SecretStorage {
  const ssSecret = rwBytes<SsSecret>('SsSecret', appId, storage);
  const encrSecret = rwBytes<EncrSecret>('EncrSecret', appId, storage);
  const sessionTopic = rwBytes<SessionTopic>('SessionTopic', appId, storage);
  const pappAccountId = rwString('PappAccountId', appId, storage);

  return {
    readSsSecret: ssSecret.read,
    writeSsSecret: ssSecret.write,
    readEncrSecret: encrSecret.read,
    writeEncrSecret: encrSecret.write,
    readSessionTopic: sessionTopic.read,
    writeSessionTopic: sessionTopic.write,
    readPappAccountId: pappAccountId.read,
    writePappAccountId: pappAccountId.write,
  };
}

const withAppId = (appId: string, key: string) => `${appId}_${key}`;

const rwBytes = <T extends Uint8Array>(key: string, appId: string, storage: StorageAdapter) => ({
  async read() {
    const value = await storage.read(withAppId(appId, key));
    if (value) {
      const aes = getAes(appId);
      return aes.decrypt(fromHex(value)) as T;
    } else {
      return null;
    }
  },
  write(value: T) {
    const aes = getAes(appId);
    return storage.write(withAppId(appId, key), toHex(aes.encrypt(value)));
  },
});

const rwString = (key: string, appId: string, storage: StorageAdapter) => {
  const bytes = rwBytes<Uint8Array>(key, appId, storage);
  return {
    async read() {
      const value = await bytes.read();
      return value ? bytesToString(value) : null;
    },
    write(value: string) {
      const b = stringToBytes(value);
      return bytes.write(b);
    },
  };
};

function getAes(appId: string) {
  return gcm(blake2b(stringToBytes(appId), { dkLen: 16 }), blake2b(stringToBytes('nonce'), { dkLen: 32 }));
}
