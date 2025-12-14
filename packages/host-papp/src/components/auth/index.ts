import type { Statement } from '@polkadot-api/sdk-statement';
import { toHex } from '@polkadot-api/utils';
import { Bytes, Enum, Tuple, str } from 'scale-ts';

import type { StatementAdapter } from '../../adapters/statement/types.js';
import { AbortError } from '../../helpers/abortError.js';
import type { Result } from '../../helpers/result.js';
import { err, fromPromise, ok } from '../../helpers/result.js';
import { toError } from '../../helpers/utils.js';
import type { EncrPublicKey, EncrSecret, SsPublicKey } from '../../modules/crypto.js';
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
} from '../../modules/crypto.js';
import { createState, readonly } from '../../modules/state.js';
import { createSession } from '../../modules/statementStore.js';
import type { UserStorage } from '../user/storage.js';
import type { SessionTopic, UserSession } from '../user/types.js';

import type { AuthentificationStatus } from './types.js';

// codecs

export const HandshakeData = Enum({
  V1: Tuple(SsPubKey, EncrPubKey, str),
});

export const HandshakeResponsePayload = Enum({
  // [encrypted, tmp_key]
  V1: Tuple(Bytes(), Bytes(65)),
});

export const HandshakeResponseSensitiveData = Tuple(Bytes(65), Bytes(32));

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
  userStorage: UserStorage;
};

export function createAuthComponent({ appId, metadata, statements, userStorage }: Params) {
  const authStatus = createState<AuthentificationStatus>({ step: 'none' });

  let authPromise: Promise<Result<UserSession | null>> | null = null;
  let abort: AbortController | null = null;

  async function handshake(signal: AbortSignal) {
    try {
      authStatus.write({ step: 'initial' });

      const { encrSecret, encrPublicKey, ssSecret, ssPublicKey } = getSecretKeys(appId);

      const handshakeTopic = createHandshakeTopic({ encrPublicKey, ssPublicKey });
      const handshakePayload = createHandshakePayloadV1({ ssPublicKey, encrPublicKey, metadata });

      authStatus.write({ step: 'pairing', payload: createDeeplink(handshakePayload) });

      const pappResponse = fromPromise(
        waitForStatements<UserSession>(statements, handshakeTopic, signal, (statements, resolve) => {
          for (const statement of [...statements].reverse()) {
            if (!statement.data) continue;

            const { sessionTopic, accountId } = retrieveSessionTopic({
              payload: statement.data.asBytes(),
              encrSecret,
              ssPublicKey,
            });

            resolve({ accountId: toHex(accountId), sessionTopic });
            break;
          }
        }),
        e => new AbortError(toError(e).message),
      );

      const userCreated = await pappResponse.then(x =>
        x.andThenPromise(user => userStorage.sessions.create(user, { ss: ssSecret, encr: encrSecret })),
      );

      return userCreated
        .map(user => {
          authStatus.write({ step: 'finished', user });
          return user;
        })
        .orElse(e => {
          if (AbortError.isAbortError(e)) {
            authStatus.write({ step: 'none' });
            return ok(null);
          } else {
            const error = toError(e);
            authStatus.write({ step: 'error', message: error.message });
            return err(error);
          }
        });
    } catch (e) {
      return err(toError(e));
    }
  }

  const authModule = {
    status: readonly(authStatus),

    async authenticate(): Promise<Result<UserSession | null>> {
      if (authPromise) {
        return authPromise;
      }

      abort = new AbortController();
      authPromise = handshake(abort.signal);

      return authPromise;
    },

    abortAuthentication() {
      if (abort) {
        authPromise = null;
        authStatus.reset();
        abort.abort('Aborted by user.');
      }
    },
  };

  return authModule;
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

function getSsKeys(appId: string) {
  const seed = createRandomSeed(appId, SS_SECRET_SEED_SIZE);
  const ssSecret = createSsSecret(seed);

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
