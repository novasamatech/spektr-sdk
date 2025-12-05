import type { Statement } from '@polkadot-api/sdk-statement';
import { toHex } from '@polkadot-api/utils';
import { createNanoEvents } from 'nanoevents';
import { Bytes, Enum, Tuple, str } from 'scale-ts';

import type { StatementAdapter } from '../adapters/statement/types.js';
import type { StorageAdapter } from '../adapters/storage/types.js';
import { isAbortError } from '../helpers/utils.js';
import type { SessionTopic } from '../types.js';

import type { EncrPublicKey, EncrSecret, SsPublicKey } from './crypto.js';
import {
  ENCR_SECRET_SEED_SIZE,
  EncrPubKey,
  SS_SECRET_SEED_SIZE,
  SsPubKey,
  createEncrSecret,
  createSharedSecret,
  createSsSecret,
  createStableSeed,
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
  | { step: 'finished'; sessionTopic: SessionTopic; pappAccountId: string };

export type SignInResult = { sessionTopic: SessionTopic; pappAccountId: string };

type Params = {
  appId: string;
  // url for additional metadata that will be displayed during pairing process
  metadata: string;
  statements: StatementAdapter;
  storage: StorageAdapter;
};

export function createSignInFlow({ appId, metadata, statements, storage }: Params) {
  const secretStorage = createSecretStorage(appId, storage);
  const events = createNanoEvents<{ status: (status: SignInStatus) => void }>();

  let signInStatus: SignInStatus = { step: 'none' };

  events.on('status', status => {
    signInStatus = status;
  });

  let signInPromise: Promise<SignInResult | null> | null = null;
  let abort: AbortController | null = null;

  const signInFlow = {
    getSignedUser(): Promise<SignInResult | null> {
      return Promise.all([secretStorage.readSessionTopic(), secretStorage.readPappAccountId()]).then(
        ([existingSessionTopic, existingPappAccountId]) => {
          if (existingSessionTopic && existingPappAccountId) {
            events.emit('status', {
              step: 'finished',
              sessionTopic: existingSessionTopic,
              pappAccountId: existingPappAccountId,
            });

            return {
              sessionTopic: existingSessionTopic,
              pappAccountId: existingPappAccountId,
            };
          }

          return null;
        },
      );
    },

    async signIn(): Promise<SignInResult | null> {
      if (signInPromise) {
        return signInPromise;
      }

      abort = new AbortController();

      events.emit('status', { step: 'initial' });

      signInPromise = signInFlow
        .getSignedUser()
        .then(async signedIn => {
          if (signedIn) {
            events.emit('status', {
              step: 'finished',
              sessionTopic: signedIn.sessionTopic,
              pappAccountId: signedIn.pappAccountId,
            });

            return signedIn;
          }

          const { ssPublicKey, encrPublicKey, encrSecret } = await getSecretKeys(appId, secretStorage);

          const handshakeTopic = createHandshakeTopic({ encrPublicKey, ssPublicKey });
          const handshakePayload = createHandshakePayload({ ssPublicKey, encrPublicKey, metadata });

          events.emit('status', { step: 'pairing', payload: createDeeplink(handshakePayload) });

          return waitForStatements<SignInResult>(
            statements,
            handshakeTopic,
            abort?.signal ?? null,
            (statements, resolve) => {
              for (const statement of [...statements].reverse()) {
                if (!statement.data) continue;

                const { sessionTopic, pappAccountId } = retrieveSessionTopic({
                  payload: statement.data.asBytes(),
                  encrSecret,
                  ssPublicKey,
                });

                resolve({ sessionTopic, pappAccountId: toHex(pappAccountId) });
                break;
              }
            },
          );
        })
        .then(async ({ sessionTopic, pappAccountId }) => {
          await secretStorage.writeSessionTopic(sessionTopic);
          await secretStorage.writePappAccountId(pappAccountId);

          events.emit('status', { step: 'finished', sessionTopic, pappAccountId });

          return { sessionTopic, pappAccountId };
        })
        .catch(e => {
          if (isAbortError(e)) {
            events.emit('status', { step: 'none' });
            return null;
          }
          events.emit('status', { step: 'error', message: e.message });
          throw e;
        });

      return signInPromise;
    },
    abortSignIn() {
      if (abort) {
        events.emit('status', { step: 'none' });
        abort.abort();
      }
    },

    getSignInStatus() {
      return signInStatus;
    },

    onStatusChange(callback: (status: SignInStatus) => void) {
      return events.on('status', callback);
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

function createHandshakePayload({
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

  console.log('decrypted', decrypted.length, 65 + 32); // true

  const [pappEncrPublicKey, userPublicKey] = HandshakeResponseSensitiveData.dec(decrypted);
  const sharedSecret = createSharedSecret(encrSecret, pappEncrPublicKey);

  const session = createSession({
    sharedSecret: sharedSecret,
    accountA: ssPublicKey,
    accountB: pappEncrPublicKey,
  });

  console.log('userPublicKey', userPublicKey.length, toHex(userPublicKey));
  console.log('sessionTopic', session.a.length, toHex(session.a));

  return {
    pappAccountId: userPublicKey,
    sessionTopic: session.a as SessionTopic,
  };
}

async function getSecretKeys(appId: string, secretStorage: SecretStorage) {
  let ssSecret = await secretStorage.readSsSecret();
  if (!ssSecret) {
    // TODO randomize seed
    // For testing purpose only
    const seed = createStableSeed(appId, SS_SECRET_SEED_SIZE);
    ssSecret = createSsSecret(seed);
    await secretStorage.writeSsSecret(ssSecret);
  }

  let encrSecret = await secretStorage.readEncrSecret();
  if (!encrSecret) {
    // TODO randomize seed
    // For testing purpose only
    const seed = createStableSeed(appId, ENCR_SECRET_SEED_SIZE);
    encrSecret = createEncrSecret(seed);
    await secretStorage.writeEncrSecret(encrSecret);
  }

  const ssPublicKey = getSsPub(ssSecret);
  const encrPublicKey = getEncrPub(encrSecret);

  return { ssPublicKey, encrPublicKey, ssSecret, encrSecret };
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

      callback(statements, value => {
        unsubscribe();
        resolve(value);
      });
    });
  });
}
