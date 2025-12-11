import { getWsProvider } from '@polkadot-api/ws-provider';
import { describe, it } from 'vitest';

import { createIdentityRpcAdapter } from '../src/adapters/identity/rpc.js';
import { createPapiLazyClient } from '../src/adapters/lazyClient/papi.js';
import { createPapiStatementAdapter } from '../src/adapters/statement/rpc.js';
import { createMemoryAdapter } from '../src/adapters/storage/memory.js';
import { SS_PROD_ENDPOINTS } from '../src/constants.js';
import { createPappAdapter } from '../src/papp.js';

describe('PAPP e2e', () => {
  it.skip('should sign in', async () => {
    const appId = 'https://test.com';
    const lazyPapiAdapter = createPapiLazyClient(getWsProvider(SS_PROD_ENDPOINTS));
    const storage = createMemoryAdapter();
    const adapter = createPappAdapter({
      appId,
      metadata: 'test',
      adapters: {
        identities: createIdentityRpcAdapter(lazyPapiAdapter, storage),
        statements: createPapiStatementAdapter(lazyPapiAdapter),
        storage,
      },
    });

    adapter.auth.onSignInStatusChange(console.log);

    const response = await adapter.auth.signIn();

    console.log(response);
  });
});
