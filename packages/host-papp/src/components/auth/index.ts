import type { Statement } from '@polkadot-api/sdk-statement';
import { toHex } from '@polkadot-api/utils';
import type { ResultAsync } from 'neverthrow';
import { err, errAsync, fromPromise, fromThrowable, ok } from 'neverthrow';

import { AbortError } from '../../helpers/abortError.js';
import { toError } from '../../helpers/utils.js';
import type { EncrPublicKey, EncrSecret, SsPublicKey } from '../../modules/crypto.js';
import {
  ENCR_SECRET_SEED_SIZE,
  SS_SECRET_SEED_SIZE,
  createEncrSecret,
  createRandomSeed,
  createSharedSecret,
  createSsHardDerivation,
  createSsSecret,
  decrypt,
  getEncrPub,
  getSsPub,
  khash,
  mergeBytes,
  stringToBytes,
} from '../../modules/crypto.js';
import { createAccount } from '../../modules/session/helpers.js';
import type { Account } from '../../modules/session/types.js';
import { createState, readonly } from '../../modules/state.js';
import { createUserSession } from '../../modules/statementStore.js';
import type { Transport } from '../../modules/transport/transport.js';
import type { Callback } from '../../types.js';
import type { UserSession, UserSessionStorage } from '../user/userSessionStorage.js';

import { HandshakeData, HandshakeResponsePayload, HandshakeResponseSensitiveData } from './codec.js';
import type { AuthentificationStatus } from './types.js';

export type AuthComponent = ReturnType<typeof createAuthComponent>;

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
  transport: Transport;
  userSessionStorage: UserSessionStorage;
};

export function createAuthComponent({ appId, metadata, transport, userSessionStorage }: Params) {
  const authStatus = createState<AuthentificationStatus>({ step: 'none' });

  let authResults: ResultAsync<UserSession | null, Error> | null = null;
  let abort: AbortController | null = null;

  function handshake(signal: AbortSignal) {
    try {
      authStatus.write({ step: 'initial' });

      const { encrSecret, encrPublicKey, ssPublicKey } = getSecretKeys(appId);

      const hostAccount = createAccount(ssPublicKey, encrPublicKey);

      const handshakePayload = createHandshakePayloadV1({ ssPublicKey, encrPublicKey, metadata }).andTee(payload =>
        authStatus.write({ step: 'pairing', payload: createDeeplink(payload) }),
      );

      const handshakeTopic = createHandshakeTopic(hostAccount);

      const pappResponse = handshakePayload
        .andThen(() => handshakeTopic)
        .asyncAndThen(topic =>
          waitForStatements<UserSession>(
            callback => transport.subscribeSession(topic, callback),
            signal,
            (statements, resolve) => {
              for (const statement of [...statements].reverse()) {
                if (!statement.data) continue;

                const session = retrieveSession({
                  hostAccount,
                  encrSecret,
                  payload: statement.data.asBytes(),
                });

                resolve(session);
                break;
              }
            },
          ),
        );

      const userCreated = pappResponse.andThen(userSessionStorage.add);

      return userCreated
        .orElse(e => (AbortError.isAbortError(e) ? ok(null) : err(toError(e))))
        .andTee(session => {
          if (session) {
            authStatus.write({ step: 'finished', session });
          } else {
            authStatus.write({ step: 'none' });
          }
        })
        .orTee(e => authStatus.write({ step: 'error', message: e.message }));
    } catch (e) {
      return errAsync(toError(e));
    }
  }

  const authModule = {
    status: readonly(authStatus),

    authenticate(): ResultAsync<UserSession | null, Error> {
      if (authResults) {
        return authResults;
      }

      abort = new AbortController();
      authResults = handshake(abort.signal);

      return authResults;
    },

    abortAuthentication() {
      if (abort) {
        authResults = null;
        authStatus.reset();
        abort.abort(new AbortError('Aborted by user.'));
      }
    },
  };

  return authModule;
}

const createHandshakeTopic = fromThrowable(
  (account: Account) => khash(account.accountId, mergeBytes(account.publicKey, stringToBytes('topic'))),
  toError,
);

const createHandshakePayloadV1 = fromThrowable(
  ({
    encrPublicKey,
    ssPublicKey,
    metadata,
  }: {
    encrPublicKey: EncrPublicKey;
    ssPublicKey: SsPublicKey;
    metadata: string;
  }) =>
    HandshakeData.enc({
      tag: 'V1',
      value: [ssPublicKey, encrPublicKey, metadata],
    }),
  toError,
);

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

function retrieveSession({
  payload,
  encrSecret,
  hostAccount,
}: {
  payload: Uint8Array;
  encrSecret: EncrSecret;
  hostAccount: Account;
}): UserSession {
  const { encrypted, tmpKey } = parseHandshakePayload(payload);

  const symmetricKey = createSharedSecret(encrSecret, tmpKey);
  const decrypted = decrypt(symmetricKey, encrypted);

  const [pappEncrPublicKey, pappAccountId] = HandshakeResponseSensitiveData.dec(decrypted);
  const sharedSecret = createSharedSecret(encrSecret, pappEncrPublicKey);

  const peerAccount = createAccount(pappAccountId, sharedSecret);

  return createUserSession(hostAccount, peerAccount);
}

function getSsKeys(appId: string) {
  const seed = createRandomSeed(appId, SS_SECRET_SEED_SIZE);
  const ssSecret = createSsHardDerivation(createSsSecret(seed), '//wallet');

  return {
    ssSecret: ssSecret,
    ssPublicKey: getSsPub(ssSecret),
  };
}

function getEncrKeys(appId: string) {
  const seed = createRandomSeed(appId, ENCR_SECRET_SEED_SIZE);
  const encrSecret = createEncrSecret(seed);

  return {
    encrSecret,
    encrPublicKey: getEncrPub(encrSecret),
  };
}

function getSecretKeys(appId: string) {
  const ss = getSsKeys(appId);
  const encr = getEncrKeys(appId);

  return {
    ...ss,
    ...encr,
  };
}

function createDeeplink(payload: Uint8Array) {
  return `polkadotapp://pair?handshake=${toHex(payload)}`;
}

function waitForStatements<T>(
  subscribe: (callback: Callback<Statement[]>) => VoidFunction,
  abortSignal: AbortSignal | null,
  callback: (statements: Statement[], resolve: (value: T) => void) => void,
): ResultAsync<T, Error> {
  return fromPromise(
    new Promise<T>((resolve, reject) => {
      const unsubscribe = subscribe(statements => {
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
    }),
    toError,
  );
}
