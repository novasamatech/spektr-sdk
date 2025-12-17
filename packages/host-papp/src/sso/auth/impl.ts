import type { LocalSessionAccount, StatementStoreAdapter } from '@novasamatech/statement-store';
import {
  createAccountId,
  createEncryption,
  createLocalSessionAccount,
  createRemoteSessionAccount,
  khash,
} from '@novasamatech/statement-store';
import type { Statement } from '@polkadot-api/sdk-statement';
import { mergeUint8, toHex } from '@polkadot-api/utils';
import { Result, ResultAsync, err, fromPromise, fromThrowable, ok } from 'neverthrow';

import type { EncrPublicKey, EncrSecret, SsPublicKey } from '../../crypto.js';
import {
  createEncrSecret,
  createSharedSecret,
  createSsHardDerivation,
  createSsSecret,
  getEncrPub,
  getSsPub,
  stringToBytes,
} from '../../crypto.js';
import { AbortError } from '../../helpers/abortError.js';
import { createState, readonly } from '../../helpers/state.js';
import { toError } from '../../helpers/utils.js';
import type { Callback } from '../../types.js';
import type { UserSecretRepository } from '../userSecretRepository.js';
import type { StoredUserSession, UserSessionRepository } from '../userSessionRepository.js';
import { createStoredUserSession } from '../userSessionRepository.js';

import { HandshakeData, HandshakeResponsePayload, HandshakeResponseSensitiveData } from './scale/handshake.js';
import type { AuthentificationStatus } from './types.js';

export type AuthComponent = ReturnType<typeof createAuth>;

type Params = {
  metadata: string;
  statementStore: StatementStoreAdapter;
  ssoSessionRepository: UserSessionRepository;
  userSecretRepository: UserSecretRepository;
};

export function createAuth({ metadata, statementStore, ssoSessionRepository, userSecretRepository }: Params) {
  const authStatus = createState<AuthentificationStatus>({ step: 'none' });

  let authResults: ResultAsync<StoredUserSession | null, Error> | null = null;
  let abort: AbortController | null = null;

  function handshake(signal: AbortSignal) {
    return getSecretKeys()
      .andTee(() => {
        authStatus.write({ step: 'initial' });
      })
      .asyncAndThen(({ encrSecret, encrPublicKey, ssSecret, ssPublicKey }) => {
        const localAccount = createLocalSessionAccount(createAccountId(ssPublicKey));

        const handshakePayload = createHandshakePayloadV1({ ssPublicKey, encrPublicKey, metadata }).andTee(payload =>
          authStatus.write({ step: 'pairing', payload: createDeeplink(payload) }),
        );

        const pappResponse = handshakePayload
          .andThen(() => createHandshakeTopic(localAccount, encrPublicKey))
          .asyncAndThen(topic =>
            waitForStatements<StoredUserSession>(
              callback => statementStore.subscribeStatements([topic], callback),
              signal,
              (statements, resolve) => {
                for (const statement of statements) {
                  if (!statement.data) continue;

                  const session = retrieveSession({
                    localAccount,
                    encrSecret,
                    payload: statement.data.asBytes(),
                  }).unwrapOr(null);

                  if (session) {
                    resolve(session);
                    break;
                  }
                }
              },
            ),
          );

        const secretesSaved = pappResponse.andThen(({ id }) =>
          userSecretRepository.write(id, { ssSecret, encrSecret }),
        );
        const userCreated = secretesSaved.andThen(() => pappResponse.andThen(ssoSessionRepository.add));

        const result = ResultAsync.combine([userCreated, secretesSaved]).map(([session]) => session);

        return result
          .orElse(e => (AbortError.isAbortError(e) ? ok(null) : err(toError(e))))
          .andTee(session => {
            authStatus.write(session ? { step: 'finished', session } : { step: 'none' });
          })
          .orTee(e => {
            authStatus.write({ step: 'error', message: e.message });
          });
      });
  }

  const authModule = {
    status: readonly(authStatus),

    authenticate(): ResultAsync<StoredUserSession | null, Error> {
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
  (account: LocalSessionAccount, encrPublicKey: EncrPublicKey) =>
    khash(account.accountId, mergeUint8([encrPublicKey, stringToBytes('topic')])),
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
      tag: 'v1',
      value: [ssPublicKey, encrPublicKey, metadata],
    }),
  toError,
);

function parseHandshakePayload(payload: Uint8Array) {
  const decoded = HandshakeResponsePayload.dec(payload);

  switch (decoded.tag) {
    case 'v1':
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
  localAccount,
}: {
  payload: Uint8Array;
  encrSecret: EncrSecret;
  localAccount: LocalSessionAccount;
}): Result<StoredUserSession, Error> {
  const { encrypted, tmpKey } = parseHandshakePayload(payload);

  const symmetricKey = createSharedSecret(encrSecret, tmpKey);

  return createEncryption(symmetricKey)
    .decrypt(encrypted)
    .map(decrypted => {
      const [pappEncrPublicKey, pappAccountId] = HandshakeResponseSensitiveData.dec(decrypted);
      const sharedSecret = createSharedSecret(encrSecret, pappEncrPublicKey);

      const peerAccount = createRemoteSessionAccount(createAccountId(pappAccountId), sharedSecret);

      return createStoredUserSession(localAccount, peerAccount);
    });
}

const getSsKeys = fromThrowable(() => {
  const ssSecret = createSsHardDerivation(createSsSecret(), '//wallet//sso');

  return {
    ssSecret: ssSecret,
    ssPublicKey: getSsPub(ssSecret),
  };
}, toError);

const getEncrKeys = fromThrowable(() => {
  const encrSecret = createEncrSecret();

  return {
    encrSecret,
    encrPublicKey: getEncrPub(encrSecret),
  };
}, toError);

function getSecretKeys() {
  return Result.combine([getSsKeys(), getEncrKeys()]).map(([ss, encr]) => ({
    ...ss,
    ...encr,
  }));
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
