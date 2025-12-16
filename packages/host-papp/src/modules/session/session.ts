import { okAsync } from 'neverthrow';
import { toHex } from 'polkadot-api/utils';
import type { Codec } from 'scale-ts';

import type { StorageAdapter } from '../../adapters/storage/types.js';
import { storageListView } from '../storageView.js';
import type { Transport } from '../transport/transport.js';

import { createSessionId } from './helpers.js';
import type { Account, Session } from './types.js';

export type SessionParams<T extends Codec<any>> = {
  ownAccount: Account;
  peerAccount: Account;
  transport: Transport;
  storage: StorageAdapter;
  codec: T;
};

export function createSession<T extends Codec<any>>({
  ownAccount,
  peerAccount,
  transport,
  storage,
  codec,
}: SessionParams<T>): Session<T> {
  // const ownSession = createSessionId(ownAccount, peerAccount);
  const peerSession = createSessionId(peerAccount, ownAccount);
  const processedStorage = storageListView<string>({
    key: `ProcessesMessages_${toHex(peerSession)}`,
    storage,
    initial: [],
    from: JSON.parse,
    to: JSON.stringify,
  });

  let subscriptions: VoidFunction[] = [];

  return {
    subscribe(callback) {
      const unsub = transport.handleRequest(ownAccount, peerAccount, codec, async message => {
        processedStorage.read().andThen(processed => {
          if (processed.includes(message.requestId)) {
            return okAsync();
          }

          return callback(message.data).andThen(processed => {
            if (processed) {
              return processedStorage.mutate(p => p.concat(message.requestId));
            } else {
              return okAsync();
            }
          });
        });
      });

      subscriptions.push(unsub);

      return () => {
        unsub();
        subscriptions = subscriptions.filter(x => x !== unsub);
      };
    },

    dispose() {
      for (const unsub of subscriptions) {
        unsub();
      }
      subscriptions = [];
    },
  };
}
