import type { Encryption, StatementProver, StatementStoreAdapter } from '@novasamatech/statement-store';
import { createSession } from '@novasamatech/statement-store';
import type { StorageAdapter } from '@novasamatech/storage-adapter';
import { fieldListView } from '@novasamatech/storage-adapter';
import { nanoid } from 'nanoid';
import { ResultAsync, okAsync } from 'neverthrow';
import type { CodecType } from 'scale-ts';

import type { Callback } from '../../types.js';
import type { UserSession } from '../ssoSessionRepository.js';

import { HostRemoteMessageCodec, HostRemoteMessageDataCodec } from './scale/remoteMessage.js';

type ProcessedMessage =
  | {
      processed: true;
      message: CodecType<typeof HostRemoteMessageCodec>;
    }
  | {
      processed: false;
    };

export type SsoSession = ReturnType<typeof createSsoSession>;

export function createSsoSession({
  userSession,
  statementStore,
  encryption,
  storage,
  prover,
}: {
  userSession: UserSession;
  statementStore: StatementStoreAdapter;
  encryption: Encryption;
  storage: StorageAdapter;
  prover: StatementProver;
}) {
  const session = createSession({
    localAccount: userSession.local,
    remoteAccount: userSession.remote,
    statementStore,
    encryption,
    prover,
  });
  const processedMessages = fieldListView<string>({
    storage,
    key: `sso_processed_${userSession.id}`,
    from: JSON.parse,
    to: JSON.stringify,
    initial: [],
  });

  return {
    request(message: CodecType<typeof HostRemoteMessageDataCodec>) {
      return session.submitRequest(HostRemoteMessageCodec, {
        messageId: nanoid(),
        data: message,
      });
    },

    sendDisconnectMessage() {
      return session.submitRequest(HostRemoteMessageCodec, {
        messageId: nanoid(),
        data: {
          tag: 'v1' as const,
          value: {
            tag: 'Disconnected' as const,
            value: undefined,
          },
        },
      });
    },

    subscribe(callback: Callback<CodecType<typeof HostRemoteMessageCodec>, ResultAsync<boolean, Error>>) {
      return session.subscribe(HostRemoteMessageCodec, messages => {
        processedMessages.read().andThen(processed => {
          const results = messages.map<ResultAsync<ProcessedMessage, Error>>(message => {
            if (message.type === 'request') {
              const isMessageProcessed = processed.includes(message.data.messageId);
              if (isMessageProcessed) {
                return okAsync({ processed: false });
              }

              return callback(message.data)
                .orTee(error => {
                  console.error('Error while processing sso messsage:', error);
                })
                .orElse(() => okAsync(false))
                .map(processed => (processed ? { processed, message: message.data } : { processed }));
            }
            return okAsync({ processed: false });
          });

          return ResultAsync.combine(results).andThen(results => {
            const newMessages = results.filter(x => x.processed).map(x => x.message.messageId);
            if (newMessages.length > 0) {
              return processedMessages.mutate(x => x.concat(newMessages));
            }
            return okAsync();
          });
        });
      });
    },
  };
}
