import type { Encryption, StatementProver, StatementStoreAdapter } from '@novasamatech/statement-store';
import { createSession } from '@novasamatech/statement-store';
import type { StorageAdapter } from '@novasamatech/storage-adapter';
import { fieldListView } from '@novasamatech/storage-adapter';
import { AccountId } from '@polkadot-api/substrate-bindings';
import { toHex } from '@polkadot-api/utils';
import { nanoid } from 'nanoid';
import { ResultAsync, err, errAsync, ok, okAsync } from 'neverthrow';
import type { CodecType } from 'scale-ts';

import type { Callback } from '../../types.js';
import type { StoredUserSession } from '../userSessionRepository.js';

import type { RemoteMessage } from './scale/remoteMessage.js';
import { RemoteMessageCodec } from './scale/remoteMessage.js';
import type { SignPayloadRequest } from './scale/signPayloadRequest.js';
import type { SignPayloadResponseData } from './scale/signPayloadResponse.js';

type ProcessedMessage =
  | {
      processed: true;
      message: CodecType<typeof RemoteMessageCodec>;
    }
  | {
      processed: false;
    };

export type UserSession = StoredUserSession & {
  sendDisconnectMessage(): ResultAsync<void, Error>;
  signPayload(payload: SignPayloadRequest): ResultAsync<SignPayloadResponseData, Error>;
  subscribe(callback: Callback<CodecType<typeof RemoteMessageCodec>, ResultAsync<boolean, Error>>): VoidFunction;
  dispose(): void;
};

export function createUserSession({
  userSession,
  statementStore,
  encryption,
  storage,
  prover,
}: {
  userSession: StoredUserSession;
  statementStore: StatementStoreAdapter;
  encryption: Encryption;
  storage: StorageAdapter;
  prover: StatementProver;
}): UserSession {
  const session = createSession({
    localAccount: userSession.localAccount,
    remoteAccount: userSession.remoteAccount,
    statementStore,
    encryption,
    prover,
  });
  const processedMessages = fieldListView<string>({
    storage,
    key: `sso_processed_${userSession.id}`,
    from: JSON.parse,
    to: JSON.stringify,
  });

  return {
    id: userSession.id,
    localAccount: userSession.localAccount,
    remoteAccount: userSession.remoteAccount,

    signPayload(payload) {
      const accountId = AccountId();

      if (toHex(accountId.enc(payload.address)) !== toHex(userSession.remoteAccount.accountId)) {
        return errAsync(new Error(`Invalid address, got ${payload.address}`));
      }

      const messageId = nanoid();
      const request = session.request(RemoteMessageCodec, {
        messageId,
        data: {
          tag: 'v1',
          value: {
            tag: 'SignRequest',
            value: payload,
          },
        },
      });

      const responseFilter = (message: RemoteMessage) => {
        return (
          message.data.tag === 'v1' &&
          message.data.value.tag === 'SignResponse' &&
          message.data.value.value.respondingTo === messageId
        );
      };

      return request
        .andThen(() => session.waitForRequestMessage(RemoteMessageCodec, responseFilter))
        .andThen(message => {
          const { data } = message.payload;

          switch (data.tag) {
            case 'v1': {
              switch (data.value.tag) {
                case 'SignResponse':
                  if (data.value.value.payload.success) {
                    return ok(data.value.value.payload.value);
                  } else {
                    return err(new Error(data.value.value.payload.value));
                  }
                default:
                  return err(new Error(`Incorrect sign response: ${data.value.tag}`));
              }
            }
            default:
              return err(new Error(`Unsupported message version ${data.tag}`));
          }
        });
    },

    sendDisconnectMessage() {
      return session
        .submitRequestMessage(RemoteMessageCodec, {
          messageId: nanoid(),
          data: {
            tag: 'v1' as const,
            value: {
              tag: 'Disconnected' as const,
              value: undefined,
            },
          },
        })
        .map(() => undefined);
    },

    subscribe(callback: Callback<CodecType<typeof RemoteMessageCodec>, ResultAsync<boolean, Error>>) {
      return session.subscribe(RemoteMessageCodec, messages => {
        processedMessages.read().andThen(processed => {
          const results = messages.map<ResultAsync<ProcessedMessage, Error>>(message => {
            if (message.type === 'request') {
              const isMessageProcessed = processed.includes(message.payload.messageId);
              if (isMessageProcessed) {
                return okAsync({ processed: false });
              }

              return callback(message.payload)
                .orTee(error => {
                  console.error('Error while processing sso messsage:', error);
                })
                .orElse(() => okAsync(false))
                .map(processed => (processed ? { processed, message: message.payload } : { processed }));
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

    dispose() {
      return session.dispose();
    },
  };
}
