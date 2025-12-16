import { getWsProvider } from '@polkadot-api/ws-provider';
import type { ResultAsync } from 'neverthrow';

import { createIdentityRpcAdapter } from './adapters/identity/rpc.js';
import type { Identity, IdentityAdapter } from './adapters/identity/types.js';
import { createPapiLazyClient } from './adapters/lazyClient/papi.js';
import { createPapiStatementAdapter } from './adapters/statement/rpc.js';
import type { StatementAdapter } from './adapters/statement/types.js';
import { createLocalStorageAdapter } from './adapters/storage/localStorage.js';
import type { StorageAdapter } from './adapters/storage/types.js';
import type { AuthComponent } from './components/auth/index.js';
import { createAuthComponent } from './components/auth/index.js';
import type { UserSessionsComponent } from './components/user/index.js';
import { createUserSessionsComponent } from './components/user/index.js';
import { createUserSessionStorage } from './components/user/userSessionStorage.js';
import { SS_PROD_ENDPOINTS } from './constants.js';
import { createTransport } from './modules/transport/transport.js';

export type PappAdapter = {
  sso: AuthComponent;
  sessions: UserSessionsComponent;
  identity: {
    getIdentity(accountId: string): ResultAsync<Identity | null, Error>;
    getIdentities(accounts: string[]): ResultAsync<Record<string, Identity | null>, Error>;
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

  const transport = createTransport({ adapter: statements });

  const userSessionStorage = createUserSessionStorage({ storage });

  const identityComponent: PappAdapter['identity'] = {
    getIdentity(accountId) {
      return identities.readIdentities([accountId]).map(map => map[accountId] ?? null);
    },
    getIdentities(accounts) {
      return identities.readIdentities(accounts);
    },
  };

  const papp: PappAdapter = {
    sso: createAuthComponent({ appId, metadata, transport, userSessionStorage }),
    sessions: createUserSessionsComponent({ transport, storage, userSessionStorage }),
    identity: identityComponent,
  };

  return papp;
}
