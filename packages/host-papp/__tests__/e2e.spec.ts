import { createLazyClient, createPapiStatementStoreAdapter } from '@novasamatech/statement-store';
import { createMemoryAdapter } from '@novasamatech/storage-adapter';
import { getWsProvider } from '@polkadot-api/ws-provider';
import { describe, it } from 'vitest';

import { SS_PROD_ENDPOINTS } from '../src/constants.js';
import { createIdentityRpcAdapter } from '../src/identity/rpcAdapter.js';
import { createPappAdapter } from '../src/papp.js';

describe('PAPP e2e', () => {
  it.skip('should sign in', async () => {
    const appId = 'https://test.com';
    const lazyPapiAdapter = createLazyClient(getWsProvider(SS_PROD_ENDPOINTS));
    const storage = createMemoryAdapter();
    const adapter = createPappAdapter({
      appId,
      metadata: 'test',
      adapters: {
        identities: createIdentityRpcAdapter(lazyPapiAdapter),
        statementStore: createPapiStatementStoreAdapter(lazyPapiAdapter),
        storage,
      },
    });

    adapter.sso.status.subscribe(console.log);

    const response = await adapter.sso.authenticate();

    console.log(response);
  });
});
