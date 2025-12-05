import { AccountId } from 'polkadot-api';

import type { LazyClientAdapter } from '../lazyClient/types.js';
import type { StorageAdapter } from '../storage/types.js';

import type { Identity, IdentityAdapter } from './types.js';

export const createIdentityRpcAdapter = (lazyClient: LazyClientAdapter, storage: StorageAdapter): IdentityAdapter => {
  const getKey = (accountId: string) => `identity_${accountId}`;

  const accCodec = AccountId();

  return {
    async getIdentity(accountId) {
      const existingIdentity = await storage.read(getKey(accountId));

      if (existingIdentity) {
        try {
          return JSON.parse(existingIdentity);
        } catch (error) {
          console.error('Error while reading identity from cache', error);
        }
      }

      const client = lazyClient.getClient();
      const unsafeApi = client.getUnsafeApi();

      const result = await unsafeApi.query.Resources?.Consumers?.getValue(accCodec.dec(accountId));

      if (result) {
        const identity: Identity = {
          fullUsername: result.full_username ? result.full_username.asText() : null,
          liteUsername: result.lite_username ? result.lite_username.asText() : null,
          credibility: result.credibility.type,
        };

        await storage.write(getKey(accountId), JSON.stringify(identity));
        return identity;
      }

      return null;
    },
  };
};
