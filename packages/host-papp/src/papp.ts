import { getWsProvider } from '@polkadot-api/ws-provider';

import { createIdentityRpcAdapter } from './adapters/identity/rpc.js';
import type { Identity, IdentityAdapter } from './adapters/identity/types.js';
import { createPapiLazyClient } from './adapters/lazyClient/papi.js';
import { createPapiStatementAdapter } from './adapters/statement/rpc.js';
import type { StatementAdapter } from './adapters/statement/types.js';
import { createLocalStorageAdapter } from './adapters/storage/localStorage.js';
import type { StorageAdapter } from './adapters/storage/types.js';
import { SS_ENDPOINTS } from './constants.js';
import type { SignInStatus } from './modules/signIn.js';
import { createSignInFlow } from './modules/signIn.js';

export type PappAdapter = {
  auth: {
    signIn(): Promise<Identity | null>;
    abortSignIn(): void;
    getCurrentUser(): Promise<Identity | null>;
    getSignInStatus(): SignInStatus;
    onSignInStatusChange(callback: (status: SignInStatus) => void): VoidFunction;
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
  let statements;
  let identities;
  let storage;

  if (adapters) {
    statements = adapters.statements;
    identities = adapters.identities;
    storage = adapters.storage;
  } else {
    const lazyPapiAdapter = createPapiLazyClient(getWsProvider(SS_ENDPOINTS));

    storage = createLocalStorageAdapter(appId);
    identities = createIdentityRpcAdapter(lazyPapiAdapter, storage);
    statements = createPapiStatementAdapter(lazyPapiAdapter);
  }

  const signInFlow = createSignInFlow({ appId, metadata, statements, storage });

  const papp: PappAdapter = {
    auth: {
      signIn() {
        return signInFlow.signIn().then(result => {
          if (result) {
            return identities.getIdentity(result.pappAccountId);
          }
          return null;
        });
      },
      getCurrentUser() {
        return signInFlow.getSignedUser().then(result => {
          if (result) {
            return identities.getIdentity(result.pappAccountId);
          }
          return null;
        });
      },

      getSignInStatus() {
        return signInFlow.getSignInStatus();
      },

      onSignInStatusChange(callback) {
        return signInFlow.onStatusChange(callback);
      },

      abortSignIn() {
        return signInFlow.abortSignIn();
      },
    },
  };

  return papp;
}
