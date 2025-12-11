import { AccountId } from 'polkadot-api';

import type { Result } from '../../helpers/result.js';
import { err, ok, seq } from '../../helpers/result.js';
import { toError } from '../../helpers/utils.js';
import type { LazyClientAdapter } from '../lazyClient/types.js';
import type { StorageAdapter } from '../storage/types.js';

import type { Identity, IdentityAdapter } from './types.js';

type InferArrayItem<T> = T extends Array<infer U> ? U : never;
type InferArgs<Args extends unknown[][]> = Args extends [infer Head, ...infer Tail extends unknown[][]]
  ? [InferArrayItem<Head>, ...InferArgs<Tail>]
  : [];

function zipWith<const Args extends unknown[][], R>(arrays: Args, iteratee: (values: InferArgs<Args>) => R): R[] {
  if (arrays.length === 0) return [];

  const minLength = Math.min(...arrays.map(arr => arr.length));
  const result: R[] = [];

  for (let i = 0; i < minLength; i++) {
    const values = arrays.map(arr => arr[i]);
    result.push(iteratee(values as InferArgs<Args>));
  }

  return result;
}

export function createCachedIdentityRequester(
  storage: StorageAdapter,
  getKey: (accountId: string) => string,
  request: (accounts: string[]) => Promise<Result<(Identity | null)[], Error>>,
) {
  async function readSingleCacheRecord(accountId: string) {
    return (await storage.read(getKey(accountId))).andThen<Result<Identity | null, Error>>(raw => {
      if (!raw) {
        return ok(null);
      }

      try {
        return ok(JSON.parse(raw));
      } catch (e) {
        return err(toError(e));
      }
    });
  }
  async function writeSingleCacheRecord(identity: Identity | null) {
    if (identity === null) {
      return ok<void>(undefined);
    }
    return storage.write(getKey(identity.accountId), JSON.stringify(identity));
  }

  async function readCache(accounts: string[]) {
    const identities = seq(...(await Promise.all(accounts.map(readSingleCacheRecord))));
    return identities.map(identities => {
      return Object.fromEntries(
        identities.map((x, i) => {
          const accountId = accounts.at(i);
          if (!accountId) {
            throw new Error(`Identity not found`);
          }

          return [accountId, x];
        }),
      );
    });
  }

  async function writeCache(identities: Record<string, Identity | null>) {
    return seq(...(await Promise.all(Object.values(identities).map(writeSingleCacheRecord)))).map(() => identities);
  }

  return async (accounts: string[]): Promise<Result<Record<string, Identity | null>, Error>> => {
    const existingIdentity = await readCache(accounts);

    return existingIdentity.andThenPromise(async existing => {
      const emptyIdentities = Object.entries(existing)
        .filter(([, identity]) => identity === null)
        .map(([accountId]) => accountId);

      if (emptyIdentities.length === 0) {
        return ok(existing);
      }

      const response = await request(accounts);

      return response
        .map(response => Object.fromEntries(zipWith([accounts, response], x => x)))
        .andThenPromise(writeCache)
        .then(x =>
          x.map(fetched => ({
            ...existing,
            ...fetched,
          })),
        );
    });
  };
}

export function createIdentityRpcAdapter(lazyClient: LazyClientAdapter, storage: StorageAdapter): IdentityAdapter {
  const requester = createCachedIdentityRequester(
    storage,
    (accountId: string) => `identity_${accountId}`,
    async accounts => {
      const client = lazyClient.getClient();
      const unsafeApi = client.getUnsafeApi();

      const results = await unsafeApi.query.Resources?.Consumers?.getValues([accounts.map(accCodec.dec)]);

      if (!results) {
        return ok<(Identity | null)[], Error>(accounts.map(() => null));
      }

      return ok(
        zipWith([accounts, results], x => x).map(([accountId, raw]) => {
          if (!raw) {
            return null;
          }

          return {
            accountId: accountId,
            fullUsername: raw.full_username ? raw.full_username.asText() : null,
            liteUsername: raw.lite_username ? raw.lite_username.asText() : null,
            credibility: raw.credibility.type,
          };
        }),
      );
    },
  );

  const accCodec = AccountId();

  return {
    async readIdentities(accounts) {
      return requester(accounts);
    },
  };
}
