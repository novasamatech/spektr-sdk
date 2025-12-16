import { Result, ResultAsync, err, errAsync, fromPromise, ok, okAsync } from 'neverthrow';
import { AccountId } from 'polkadot-api';

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
  request: (accounts: string[]) => ResultAsync<(Identity | null)[], Error>,
) {
  function readSingleCacheRecord(accountId: string) {
    return storage.read(getKey(accountId)).andThen<Result<Identity | null, Error>>(raw => {
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

  function writeSingleCacheRecord(accountId: string, identity: Identity | null) {
    if (identity === null) {
      return okAsync<void>(undefined);
    }
    return storage.write(getKey(accountId), JSON.stringify(identity));
  }

  function readCache(accounts: string[]) {
    if (accounts.length === 0) {
      return okAsync<Record<string, Identity | null>>({});
    }

    const identities = ResultAsync.combine(accounts.map(readSingleCacheRecord));
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

  function writeCache(identities: Record<string, Identity | null>) {
    return ResultAsync.combine(Object.entries(identities).map(args => writeSingleCacheRecord(...args))).map(
      () => identities,
    );
  }

  return (accounts: string[]): ResultAsync<Record<string, Identity | null>, Error> => {
    return readCache(accounts).andThen(existing => {
      const emptyIdentities = Object.entries(existing)
        .filter(([, identity]) => identity === null)
        .map(([accountId]) => accountId);

      if (emptyIdentities.length === 0) {
        return okAsync(existing);
      }

      return request(accounts)
        .map(response => Object.fromEntries(zipWith([accounts, response], x => x)))
        .andThen(writeCache)
        .map(fetched => ({
          ...existing,
          ...fetched,
        }));
    });
  };
}

export function createIdentityRpcAdapter(lazyClient: LazyClientAdapter, storage: StorageAdapter): IdentityAdapter {
  const requester = createCachedIdentityRequester(
    storage,
    (accountId: string) => `identity_${accountId}`,
    accounts => {
      const client = lazyClient.getClient();
      const unsafeApi = client.getUnsafeApi();

      const method = unsafeApi.query.Resources?.Consumers;

      if (!method) {
        return errAsync(new Error('Method Resources:Consumers not found'));
      }

      const results = fromPromise(method.getValues([accounts.map(accCodec.dec)]), toError);

      return results.andThen(results => {
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
      });
    },
  );

  const accCodec = AccountId();

  return {
    readIdentities: requester,
  };
}
