import { getWsProvider } from '@polkadot-api/ws-provider';

import { createIdentityRpcAdapter } from './adapters/identity/rpc.js';
import type { Identity, IdentityAdapter } from './adapters/identity/types.js';
import { createPapiLazyClient } from './adapters/lazyClient/papi.js';
import { createPapiStatementAdapter } from './adapters/statement/rpc.js';
import type { StatementAdapter } from './adapters/statement/types.js';
import { createLocalStorageAdapter } from './adapters/storage/localStorage.js';
import type { StorageAdapter } from './adapters/storage/types.js';
import { SS_PROD_ENDPOINTS } from './constants.js';
import type { Result } from './helpers/result.js';
import { ok } from './helpers/result.js';
import { nonNullable } from './helpers/utils.js';
import type { SignInStatus } from './modules/signIn.js';
import { createSignInFlow } from './modules/signIn.js';

export type PappAdapter = {
  users: {
    // sign in
    signIn(): Promise<Identity | null>;
    abortSignIn(): void;
    getSignInStatus(): SignInStatus;
    onSignInStatusChange(callback: (status: SignInStatus) => void): VoidFunction;

    // local users management
    getSelectedUser(): Promise<Identity | null>;
    getAvailableUsers(): Promise<Identity[]>;
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

  const signInFlow = createSignInFlow({ appId, metadata, statements, storage });

  async function readIdentity(accountId: string): Promise<Result<Identity | null>> {
    return (await identities.readIdentities([accountId])).map(map => map[accountId] ?? null);
  }

  const users: PappAdapter['users'] = {
    async signIn() {
      const result = await signInFlow.signIn();

      return result
        .andThenPromise(async user => (user ? readIdentity(user.accountId) : ok(null)))
        .then(x => x.unwrapOrThrow());
    },
    async getSelectedUser() {
      const result = await signInFlow.users.readSelectedUser();

      return result
        .andThenPromise(async user => (user ? readIdentity(user.accountId) : ok(null)))
        .then(x => x.unwrapOrThrow());
    },

    getSignInStatus() {
      return signInFlow.signInStatus.read();
    },

    onSignInStatusChange(callback) {
      return signInFlow.signInStatus.subscribe(callback);
    },

    abortSignIn() {
      return signInFlow.abortSignIn();
    },

    async getAvailableUsers(): Promise<Identity[]> {
      const accounts = await signInFlow.users.readAccounts();
      const accountIdentities = await accounts.andThenPromise(identities.readIdentities);
      return accountIdentities.map(map => Object.values(map).filter(nonNullable)).unwrapOrThrow();
    },
  };

  const papp: PappAdapter = {
    users,
  };

  return papp;
}
