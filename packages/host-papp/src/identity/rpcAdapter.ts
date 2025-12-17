import type { LazyClient } from '@novasamatech/statement-store';
import { AccountId } from '@polkadot-api/substrate-bindings';
import { errAsync, fromPromise, ok } from 'neverthrow';

import { toError } from '../helpers/utils.js';
import { zipWith } from '../helpers/zipWith.js';

import type { Identity, IdentityAdapter } from './types.js';

export function createIdentityRpcAdapter(lazyClient: LazyClient): IdentityAdapter {
  const accCodec = AccountId();

  return {
    readIdentities(accounts) {
      const client = lazyClient.getClient();
      const unsafeApi = client.getUnsafeApi();

      const method = unsafeApi.query.Resources?.Consumers;

      if (!method) {
        return errAsync(new Error('Method Resources.Consumers not found'));
      }

      const results = fromPromise(method.getValues([accounts.map(accCodec.dec)]), toError);

      return results.andThen(results => {
        if (!results) {
          return ok({});
        }

        return ok(
          Object.fromEntries(
            zipWith([accounts, results], x => x).map<[string, Identity | null]>(([accountId, raw]) => {
              if (!raw) {
                return [accountId, null];
              }
              console.log(raw.credibility);

              return [
                accountId,
                {
                  accountId: accountId,
                  fullUsername: raw.full_username ? raw.full_username.asText() : null,
                  liteUsername: raw.lite_username ? raw.lite_username.asText() : null,
                  credibility: raw.credibility.type,
                },
              ];
            }),
          ),
        );
      });
    },
  };
}
