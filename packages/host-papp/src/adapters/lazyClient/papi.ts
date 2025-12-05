import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import type { PolkadotClient } from 'polkadot-api';
import { createClient } from 'polkadot-api';

import type { LazyClientAdapter } from './types.js';

export const createPapiLazyClient = (provider: JsonRpcProvider): LazyClientAdapter => {
  let client: PolkadotClient | null = null;

  return {
    getClient() {
      if (!client) {
        client = createClient(provider);
      }
      return client;
    },
  };
};
