import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import type { PolkadotClient } from 'polkadot-api';
import { createClient } from 'polkadot-api';

export type LazyClient = ReturnType<typeof createLazyClient>;

export const createLazyClient = (provider: JsonRpcProvider) => {
  let client: PolkadotClient | null = null;

  return {
    getClient() {
      if (!client) {
        client = createClient(provider);
      }
      return client;
    },
    disconnect() {
      if (client) {
        client.destroy();
      }
    },
  };
};
