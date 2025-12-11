import type { Statement } from '@polkadot-api/sdk-statement';
import { toHex } from '@polkadot-api/utils';
import { Bytes, Enum, Tuple, str } from 'scale-ts';

import type { StatementAdapter } from '../adapters/statement/types.js';
import type { StorageAdapter } from '../adapters/storage/types.js';
import type { Result } from '../helpers/result.js';
import { err, fromPromise, ok, seq } from '../helpers/result.js';
import { isAbortError, toError } from '../helpers/utils.js';
import type { SessionTopic } from '../types.js';

import type { EncrPublicKey, EncrSecret, SsPublicKey } from './crypto.js';
import {
  ENCR_SECRET_SEED_SIZE,
  EncrPubKey,
  SS_SECRET_SEED_SIZE,
  SsPubKey,
  createEncrSecret,
  createRandomSeed,
  createSharedSecret,
  createSsSecret,
  createSymmetricKey,
  decrypt,
  getEncrPub,
  getSsPub,
  khash,
  mergeBytes,
  stringToBytes,
} from './crypto.js';
import type { SecretStorage } from './secretStorage.js';
import { createSecretStorage } from './secretStorage.js';
import { createSession } from './statementStore.js';
import { createSyncStorage } from './syncStorage.js';
import type { User } from './userManager.js';
import { createUserManager } from './userManager.js';

// codecs

export const HandshakeData = Enum({
  V1: Tuple(SsPubKey, EncrPubKey, str),
});

export const HandshakeResponsePayload = Enum({
  // [encrypted, tmp_key]
  V1: Tuple(Bytes(), Bytes(65)),
});

export const HandshakeResponseSensitiveData = Tuple(Bytes(65), Bytes(32));

export type SignInStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'pairing'; payload: string }
  | { step: 'error'; message: string }
  | { step: 'finished'; user: User };

type Params = {
  /**
   * Host app Id.
   * CAUTION! This value should be stable.
   */
  appId: string;
  /**
   * URL for additional metadata that will be displayed during pairing process.
   * Content of provided json shound be
   * ```ts
   * interface Metadata {
   *   name: string;
   *   icon: string; // url for icon. Icon should be a rasterized image with min size 256x256 px.
   * }
   * ```
   */
  metadata: string;
  statements: StatementAdapter;
  storage: StorageAdapter;
};

export function createSignInFlow({ appId, metadata, statements, storage }: Params) {
  const userManager = createUserManager(appId, storage);
  const secretStorage = createSecretStorage(appId, storage);

  const signInStatus = createSyncStorage<SignInStatus>({ step: 'none' });

  let signInPromise: Promise<Result<User | null>> | null = null;
  let abort: AbortController | null = null;

  async function handshake(signal: AbortSignal) {
    signInStatus.write({ step: 'initial' });

    const secrets = await getSecretKeys(appId, secretStorage);

    return secrets.andThenPromise(async ({ ssPublicKey, encrPublicKey, encrSecret }) => {
      const handshakeTopic = createHandshakeTopic({ encrPublicKey, ssPublicKey });
      const handshakePayload = createHandshakePayloadV1({ ssPublicKey, encrPublicKey, metadata });

      signInStatus.write({ step: 'pairing', payload: createDeeplink(handshakePayload) });

      const statementStoreResponse = fromPromise(
        waitForStatements<User>(statements, handshakeTopic, signal, (statements, resolve) => {
          for (const statement of [...statements].reverse()) {
            if (!statement.data) continue;

            const { sessionTopic, accountId } = retrieveSessionTopic({
              payload: statement.data.asBytes(),
              encrSecret,
              ssPublicKey,
            });

            resolve({ sessionTopic, accountId: toHex(accountId) });
            break;
          }
        }),
        toError,
      );

      return statementStoreResponse
        .then(x => x.andThenPromise(userManager.createUser))
        .then(async result =>
          result
            .map(user => {
              signInStatus.write({ step: 'finished', user });
              return user;
            })
            .orElse(e => {
              const error = toError(e);
              if (isAbortError(error)) {
                signInStatus.write({ step: 'none' });
                return ok(null);
              } else {
                signInStatus.write({ step: 'error', message: error.message });
                return err(error);
              }
            }),
        );
    });
  }

  const signInFlow = {
    signInStatus,

    users: userManager,

    async signIn(): Promise<Result<User | null>> {
      if (signInPromise) {
        return signInPromise;
      }

      abort = new AbortController();

      signInPromise = handshake(abort.signal);

      return signInPromise;
    },
    abortSignIn() {
      if (abort) {
        signInPromise = null;
        signInStatus.reset();
        abort.abort();
      }
    },
  };

  return signInFlow;
}

function createHandshakeTopic({
  encrPublicKey,
  ssPublicKey,
}: {
  encrPublicKey: EncrPublicKey;
  ssPublicKey: SsPublicKey;
}) {
  return khash(ssPublicKey, mergeBytes(encrPublicKey, stringToBytes('topic')));
}

function createHandshakePayloadV1({
  encrPublicKey,
  ssPublicKey,
  metadata,
}: {
  encrPublicKey: EncrPublicKey;
  ssPublicKey: SsPublicKey;
  metadata: string;
}) {
  return HandshakeData.enc({
    tag: 'V1',
    value: [ssPublicKey, encrPublicKey, metadata],
  });
}

function parseHandshakePayload(payload: Uint8Array) {
  const decoded = HandshakeResponsePayload.dec(payload);

  switch (decoded.tag) {
    case 'V1':
      return {
        encrypted: decoded.value[0],
        tmpKey: decoded.value[1],
      };
    default:
      throw new Error('Unsupported handshake payload version');
  }
}

function retrieveSessionTopic({
  payload,
  encrSecret,
  ssPublicKey,
}: {
  payload: Uint8Array;
  encrSecret: EncrSecret;
  ssPublicKey: SsPublicKey;
}) {
  const { encrypted, tmpKey } = parseHandshakePayload(payload);

  const symmetricKey = createSymmetricKey(createSharedSecret(encrSecret, tmpKey));
  const decrypted = decrypt(symmetricKey, encrypted);

  const [pappEncrPublicKey, userPublicKey] = HandshakeResponseSensitiveData.dec(decrypted);
  const sharedSecret = createSharedSecret(encrSecret, pappEncrPublicKey);

  const session = createSession({
    sharedSecret: sharedSecret,
    accountA: ssPublicKey,
    accountB: pappEncrPublicKey,
  });

  return {
    accountId: userPublicKey,
    sessionTopic: session.a as SessionTopic,
  };
}

async function getSsKeys(appId: string, secretStorage: SecretStorage) {
  return (await secretStorage.readSsSecret())
    .andThenPromise(async ssSecret => {
      if (ssSecret) {
        return ok(ssSecret);
      }

      const seed = createRandomSeed(appId, SS_SECRET_SEED_SIZE);
      const newSsSecret = createSsSecret(seed);

      const write = await secretStorage.writeSsSecret(newSsSecret);
      return write.map(() => newSsSecret);
    })
    .then(x =>
      x.map(ssSecret => ({
        ssSecret: ssSecret,
        ssPublicKey: getSsPub(ssSecret),
      })),
    );
}

async function getEncrKeys(appId: string, secretStorage: SecretStorage) {
  return (await secretStorage.readEncrSecret())
    .andThenPromise(async encrSecret => {
      if (encrSecret) {
        return ok(encrSecret);
      }

      const seed = createRandomSeed(appId, ENCR_SECRET_SEED_SIZE);
      const newEncrSecret = createEncrSecret(seed);

      const write = await secretStorage.writeEncrSecret(newEncrSecret);
      return write.map(() => newEncrSecret);
    })
    .then(x =>
      x.map(encrSecret => ({
        encrSecret,
        encrPublicKey: getEncrPub(encrSecret),
      })),
    );
}

async function getSecretKeys(appId: string, secretStorage: SecretStorage) {
  return seq(await getSsKeys(appId, secretStorage), await getEncrKeys(appId, secretStorage)).map(([ss, encr]) => ({
    ...ss,
    ...encr,
  }));
}

function createDeeplink(payload: Uint8Array) {
  return `polkadotapp://pair?handshake=${toHex(payload)}`;
}

function waitForStatements<T>(
  transport: StatementAdapter,
  topic: Uint8Array,
  abortSignal: AbortSignal | null,
  callback: (statements: Statement[], resolve: (value: T) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const unsubscribe = transport.subscribeStatements([topic], statements => {
      if (abortSignal?.aborted) {
        unsubscribe();
        try {
          abortSignal.throwIfAborted();
        } catch (e) {
          reject(e);
        }
      }

      try {
        callback(statements, value => {
          unsubscribe();
          resolve(value);
        });
      } catch (e) {
        unsubscribe();
        reject(e);
      }
    });
  });
}
