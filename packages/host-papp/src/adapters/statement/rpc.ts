import { createStatementSdk } from '@polkadot-api/sdk-statement';
import { FixedSizeBinary } from '@polkadot-api/substrate-bindings';

import type { LazyClientAdapter } from '../lazyClient/types.js';

import type { StatementAdapter } from './types.js';

export function createPapiStatementAdapter(lazyClient: LazyClientAdapter): StatementAdapter {
  const POLLING_INTERVAL = 1000;
  const sdk = createStatementSdk((method, params) => {
    const client = lazyClient.getClient();
    return client._request(method, params);
  });

  const transportProvider: StatementAdapter = {
    getStatements(topics) {
      // @ts-expect-error lib versions mismatch
      return sdk.getStatements({ topics: topics.map(topic => new FixedSizeBinary<32>(topic)) });
    },
    subscribeStatements(topics, callback) {
      return polling(POLLING_INTERVAL, () => transportProvider.getStatements(topics), callback);
    },
    submitStatement(statement) {
      return sdk.submit(statement);
    },
  };

  return transportProvider;
}

function polling<R>(interval: number, request: () => Promise<R>, callback: (response: R) => void): VoidFunction {
  let active = true;
  let tm: NodeJS.Timeout | null = null;
  function createCycle() {
    tm = setTimeout(() => {
      if (!active) {
        return;
      }

      request()
        .then(callback)
        .finally(() => {
          createCycle();
        });
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
