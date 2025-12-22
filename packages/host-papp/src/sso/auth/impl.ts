import type { LazyClient, LocalSessionAccount, StatementStoreAdapter } from '@novasamatech/statement-store';
import {
  createAccountId,
  createEncryption,
  createLocalSessionAccount,
  createRemoteSessionAccount,
  khash,
} from '@novasamatech/statement-store';
import type { Statement } from '@polkadot-api/sdk-statement';
import { mergeUint8, toHex } from '@polkadot-api/utils';
import { generateMnemonic } from '@polkadot-labs/hdkd-helpers';
import { Result, ResultAsync, err, fromPromise, fromThrowable, ok } from 'neverthrow';

import type { DerivedSr25519Account, EncrPublicKey, EncrSecret, SsPublicKey } from '../../crypto.js';
import { createEncrSecret, createSharedSecret, deriveSr25519Account, getEncrPub, stringToBytes } from '../../crypto.js';
import { AbortError } from '../../helpers/abortError.js';
import { createState, readonly } from '../../helpers/state.js';
import { toError } from '../../helpers/utils.js';
import type { Callback } from '../../types.js';
import type { UserSecretRepository } from '../userSecretRepository.js';
import type { StoredUserSession, UserSessionRepository } from '../userSessionRepository.js';
import { createStoredUserSession } from '../userSessionRepository.js';

import { createAliceVerifier, createAttestationService } from './attestationService.js';
import { HandshakeData, HandshakeResponsePayload, HandshakeResponseSensitiveData } from './scale/handshake.js';
import type { AuthentificationStatus } from './types.js';

export type AuthComponent = ReturnType<typeof createAuth>;

type Params = {
  metadata: string;
  statementStore: StatementStoreAdapter;
  ssoSessionRepository: UserSessionRepository;
  userSecretRepository: UserSecretRepository;
  lazyClient: LazyClient;
};

export function createAuth({
  metadata,
  statementStore,
  ssoSessionRepository,
  userSecretRepository,
  lazyClient,
}: Params) {
  const authStatus = createState<AuthentificationStatus>({ step: 'none' });

  let authResult: ResultAsync<StoredUserSession | null, Error> | null = null;
  let abort: AbortController | null = null;

  function attestateAccount(account: DerivedSr25519Account, signal: AbortSignal) {
    const attestationService = createAttestationService(lazyClient);

    authStatus.write({ step: 'attestation' });

    const verifier = createAliceVerifier();
    const username = attestationService.claimUsername();

    return attestationService
      .grantVerifierAllowance(verifier)
      .andThrough(() => processSignal(signal))
      .andThen(() => attestationService.registerLitePerson(username, account, verifier))
      .andThrough(() => processSignal(signal));
  }

  function handshake(account: DerivedSr25519Account, mnemonic: string, signal: AbortSignal) {
    const localAccount = createLocalSessionAccount(createAccountId(account.publicKey));

    return createEncrKeys(mnemonic).asyncAndThen(({ encrSecret, encrPublicKey }) => {
      const handshakePayload = createHandshakePayloadV1({
        ssPublicKey: account.publicKey,
        encrPublicKey,
        metadata,
      }).andTee(payload => authStatus.write({ step: 'pairing', payload: createDeeplink(payload) }));

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
        userSecretRepository.write(id, { ssSecret: account.secret, encrSecret, mnemonic }),
      );
      const userCreated = secretesSaved.andThen(() => pappResponse.andThen(ssoSessionRepository.add));

      const result = ResultAsync.combine([userCreated, secretesSaved]).map(([session]) => session);

      return result.orElse(e => (AbortError.isAbortError(e) ? ok(null) : err(toError(e))));
    });
  }

  const authModule = {
    status: readonly(authStatus),

    authenticate(): ResultAsync<StoredUserSession | null, Error> {
      if (authResult) {
        return authResult;
      }

      abort = new AbortController();
      const signal = abort.signal;

      const mnemonic = generateMnemonic();
      const account = deriveSr25519Account(mnemonic, '//wallet');

      authStatus.write({ step: 'initial' });
      authResult = attestateAccount(account, signal)
        .andThen(() => handshake(account, mnemonic, signal))
        .andTee(session => {
          authStatus.write(session ? { step: 'finished', session } : { step: 'none' });
        })
        .orTee(e => {
          authResult = null;
          abort = null;
          authStatus.write({ step: 'error', message: e.message });
        });

      return authResult;
    },

    abortAuthentication() {
      if (abort) {
        abort.abort(new AbortError('Aborted by user.'));
        abort = null;
      }
      authResult = null;
      authStatus.reset();
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

const createEncrKeys = fromThrowable((mnemonic: string) => {
  const encrSecret = createEncrSecret(mnemonic);

  return {
    encrSecret,
    encrPublicKey: getEncrPub(encrSecret),
  };
}, toError);

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

function createDeeplink(payload: Uint8Array) {
  return `polkadotapp://pair?handshake=${toHex(payload)}`;
}

function waitForStatements<T>(
  subscribe: (callback: Callback<Statement[]>) => VoidFunction,
  signal: AbortSignal,
  callback: (statements: Statement[], resolve: (value: T) => void) => void,
): ResultAsync<T, Error> {
  return fromPromise(
    new Promise<T>((resolve, reject) => {
      const unsubscribe = subscribe(statements => {
        const abortError = processSignal(signal).match(
          () => null,
          e => e,
        );

        if (abortError) {
          unsubscribe();
          reject(abortError);
          return;
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

function processSignal(signal: AbortSignal) {
  try {
    signal.throwIfAborted();
    return ok<void>();
  } catch (e) {
    return err(toError(e));
  }
}
