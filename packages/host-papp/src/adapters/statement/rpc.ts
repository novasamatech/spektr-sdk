import { createStatementSdk } from '@polkadot-api/sdk-statement';
import { Binary } from '@polkadot-api/substrate-bindings';
import { toHex } from '@polkadot-api/utils';
import type { ResultAsync } from 'neverthrow';
import { fromPromise } from 'neverthrow';

import { toError } from '../../helpers/utils.js';
import type { LazyClientAdapter } from '../lazyClient/types.js';

import type { StatementAdapter, StatementsCallback } from './types.js';

const POLLING_INTERVAL = 1000;

function createKey(topics: Uint8Array[]): string {
  return topics.map(toHex).sort().join('');
}

export function createPapiStatementAdapter(lazyClient: LazyClientAdapter): StatementAdapter {
  const sdk = createStatementSdk((method, params) => {
    const client = lazyClient.getClient();
    return client._request(method, params);
  });

  const pollings = new Map<string, VoidFunction>();
  const subscriptions = new Map<string, StatementsCallback[]>();

  function addSubscription(key: string, subscription: StatementsCallback) {
    let subs = subscriptions.get(key);
    if (!subs) {
      subs = [];
      subscriptions.set(key, subs);
    }

    subs.push(subscription);
    return subs;
  }

  function removeSubscription(key: string, subscription: StatementsCallback) {
    let subs = subscriptions.get(key);
    if (!subs) {
      return [];
    }

    subs = subs.filter(x => x !== subscription);
    return subs;
  }

  const transportProvider: StatementAdapter = {
    queryStatements(topics, destination) {
      return fromPromise(
        sdk.getStatements({
          topics: topics.map(t => Binary.fromBytes(t)),
          dest: destination ? Binary.fromBytes(destination) : null,
        }),
        toError,
      );
    },
    subscribeStatements(topics, callback) {
      const key = createKey(topics);
      const callbacks = addSubscription(key, callback);

      if (callbacks.length === 1) {
        const unsub = polling(
          POLLING_INTERVAL,
          () => transportProvider.queryStatements(topics),
          statements => {
            const list = subscriptions.get(key);
            if (list) {
              for (const fn of list) {
                fn(statements);
              }
            }
          },
        );

        pollings.set(key, unsub);
      }

      return () => {
        const callbacks = removeSubscription(key, callback);

        if (callbacks.length === 0) {
          const stopPolling = pollings.get(key);
          stopPolling?.();
          pollings.delete(key);
        }
      };
    },
    submitStatement(statement) {
      return fromPromise(sdk.submit(statement), toError);
    },
  };

  return transportProvider;
}

function polling<R>(
  interval: number,
  request: () => ResultAsync<R, Error>,
  callback: (response: R) => void,
): VoidFunction {
  let active = true;
  let tm: NodeJS.Timeout | null = null;
  function createCycle() {
    tm = setTimeout(() => {
      if (!active) {
        return;
      }

      request().match(
        data => {
          callback(data);
          createCycle();
        },
        () => {
          createCycle();
        },
      );
    }, interval);
  }

  createCycle();

  return () => {
    active = false;
    if (tm !== null) {
      clearTimeout(tm);
    }
  };
}
