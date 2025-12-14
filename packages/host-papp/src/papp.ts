import { getWsProvider } from '@polkadot-api/ws-provider';

import { createIdentityRpcAdapter } from './adapters/identity/rpc.js';
import type { Identity, IdentityAdapter } from './adapters/identity/types.js';
import { createPapiLazyClient } from './adapters/lazyClient/papi.js';
import { createPapiStatementAdapter } from './adapters/statement/rpc.js';
import type { StatementAdapter } from './adapters/statement/types.js';
import { createLocalStorageAdapter } from './adapters/storage/localStorage.js';
import type { StorageAdapter } from './adapters/storage/types.js';
import { createAuthComponent } from './components/auth/index.js';
import type { AuthentificationStatus } from './components/auth/types.js';
import { createUserComponent } from './components/user/index.js';
import { createUserStorage } from './components/user/storage.js';
import { SS_PROD_ENDPOINTS } from './constants.js';
import { callbackRaceResolver } from './helpers/callbackRaceResolver.js';
import type { Result } from './helpers/result.js';
import { ok } from './helpers/result.js';
import { nonNullable } from './helpers/utils.js';

export type PappAdapter = {
  user: {
    // sign in
    authenticate(): Promise<Identity | null>;
    abortAuthentication(): void;
    getAuthStatus(): AuthentificationStatus;
    onAuthStatusChange(callback: (status: AuthentificationStatus) => void): VoidFunction;

    disconnect(accountId: string): Promise<void>;

    // local users management
    getSelectedUser(): Promise<Identity | null>;
    selectUser(accountId: string): Promise<void>;
    onSelectedUserChange(callback: (user: Identity | null) => void): VoidFunction;

    getUsers(): Promise<Identity[]>;
    onUsersChange(callback: (user: Identity[]) => void): VoidFunction;
  };
};

type Adapters = {
  statements: StatementAdapter;
  identities: IdentityAdapter;
  storage: StorageAdapter;
};

type Params = {
  appId: string;
  metadata: string;
  adapters?: Adapters;
};

export function createPappAdapter({ appId, metadata, adapters }: Params): PappAdapter {
  let statements: StatementAdapter;
  let identities: IdentityAdapter;
  let storage: StorageAdapter;

  if (adapters) {
    statements = adapters.statements;
    identities = adapters.identities;
    storage = adapters.storage;
  } else {
    const lazyPapiAdapter = createPapiLazyClient(getWsProvider(SS_PROD_ENDPOINTS));

    storage = createLocalStorageAdapter(appId);
    identities = createIdentityRpcAdapter(lazyPapiAdapter, storage);
    statements = createPapiStatementAdapter(lazyPapiAdapter);
  }

  const userStorage = createUserStorage(appId, storage);
  const authComponent = createAuthComponent({ appId, metadata, statements, userStorage });
  const userComponent = createUserComponent({ appId, statements, userStorage });

  async function readIdentity(accountId: string): Promise<Result<Identity | null>> {
    return (await identities.readIdentities([accountId])).map(map => map[accountId] ?? null);
  }

  const user: PappAdapter['user'] = {
    async authenticate() {
      const result = await authComponent.authenticate();

      return result
        .andThenPromise(async user => (user ? readIdentity(user.accountId) : ok(null)))
        .then(x => x.unwrapOrThrow());
    },
    async getSelectedUser() {
      const result = await userStorage.sessions.readSelectedUser();

      return result
        .andThenPromise(async user => (user ? readIdentity(user.accountId) : ok(null)))
        .then(x => x.unwrapOrThrow());
    },

    getAuthStatus() {
      return authComponent.status.read();
    },

    onAuthStatusChange(callback) {
      return authComponent.status.subscribe(callback);
    },

    abortAuthentication() {
      return authComponent.abortAuthentication();
    },

    disconnect(accountId) {
      return userComponent.disconnect(accountId).then(x => x.unwrapOrThrow());
    },

    async selectUser(accountId) {
      return userStorage.accounts
        .select(accountId)
        .then(x => x.unwrapOrThrow())
        .then(() => undefined);
    },

    onSelectedUserChange(callback) {
      const resolver = callbackRaceResolver<string | null, Identity | null>(callback, async accountId => {
        if (!accountId) {
          return null;
        }

        return readIdentity(accountId).then(x => x.unwrap());
      });

      return userStorage.accounts.subscribeSelectedAccount(resolver);
    },

    async getUsers(): Promise<Identity[]> {
      const accounts = await userStorage.accounts.read();
      const accountIdentities = await accounts.andThenPromise(identities.readIdentities);
      return accountIdentities.map(map => Object.values(map).filter(nonNullable)).unwrapOrThrow();
    },

    onUsersChange(callback): VoidFunction {
      const resolver = callbackRaceResolver<string[], Identity[]>(callback, accounts => {
        return identities
          .readIdentities(accounts)
          .then(x => x.unwrapOrThrow())
          .then(map => Object.values(map).filter(nonNullable));
      });

      return userStorage.accounts.subscribe(resolver);
    },
  };

  const papp: PappAdapter = {
    user,
  };

  return papp;
}
