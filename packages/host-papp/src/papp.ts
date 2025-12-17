import type { LazyClient, StatementStoreAdapter } from '@novasamatech/statement-store';
import { createLazyClient, createPapiStatementStoreAdapter } from '@novasamatech/statement-store';
import type { StorageAdapter } from '@novasamatech/storage-adapter';
import { createLocalStorageAdapter } from '@novasamatech/storage-adapter';
import { getWsProvider } from '@polkadot-api/ws-provider';

import { SS_PROD_ENDPOINTS } from './constants.js';
import { createIdentityRepository } from './identity/impl.js';
import { createIdentityRpcAdapter } from './identity/rpcAdapter.js';
import type { IdentityAdapter, IdentityRepository } from './identity/types.js';
import type { AuthComponent } from './sso/auth/impl.js';
import { createAuth } from './sso/auth/impl.js';
import type { SsoSessionManager } from './sso/sessionManager/impl.js';
import { createSsoSessionManager } from './sso/sessionManager/impl.js';
import { createSsoSessionRepository } from './sso/ssoSessionRepository.js';
import { createUserSecretRepository } from './sso/userSecretRepository.js';

export type PappAdapter = {
  sso: AuthComponent;
  sessions: SsoSessionManager;
  identity: IdentityRepository;
};

type Adapters = {
  statementStore: StatementStoreAdapter;
  identities: IdentityAdapter;
  storage: StorageAdapter;
  lazyClient: LazyClient;
};

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
  adapters?: Partial<Adapters>;
};

export function createPappAdapter({ appId, metadata, adapters }: Params): PappAdapter {
  const lazyClient = adapters?.lazyClient ?? createLazyClient(getWsProvider(SS_PROD_ENDPOINTS));

  const statementStore = adapters?.statementStore ?? createPapiStatementStoreAdapter(lazyClient);
  const identities = adapters?.identities ?? createIdentityRpcAdapter(lazyClient);
  const storage = adapters?.storage ?? createLocalStorageAdapter(appId);

  const ssoSessionRepository = createSsoSessionRepository(storage);
  const userSecretRepository = createUserSecretRepository(appId, storage);

  return {
    sso: createAuth({ metadata, statementStore, ssoSessionRepository, userSecretRepository }),
    sessions: createSsoSessionManager({ storage, statementStore, ssoSessionRepository, userSecretRepository }),
    identity: createIdentityRepository({ adapter: identities, storage }),
  };
}
