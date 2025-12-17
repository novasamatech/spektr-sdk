import type { Statement } from '@polkadot-api/sdk-statement';
import { Binary } from '@polkadot-api/substrate-bindings';
import { nanoid } from 'nanoid';
import { ResultAsync, err, fromThrowable, ok, okAsync } from 'neverthrow';
import type { Codec } from 'scale-ts';
import { Bytes } from 'scale-ts';

import type { StatementStoreAdapter } from '../adapter/types.js';
import { khash, stringToBytes } from '../crypto.js';
import { nonNullable, toError } from '../helpers.js';
import type { SessionId } from '../model/session.js';
import { createSessionId } from '../model/session.js';
import type { LocalSessionAccount, RemoteSessionAccount } from '../model/sessionAccount.js';
import type { Callback } from '../types.js';

import type { Encryption } from './encyption.js';
import { toMessage } from './messageMapper.js';
import type { TransportError } from './scale/statementData.js';
import { StatementData } from './scale/statementData.js';
import type { StatementProver } from './statementProver.js';
import type { Message, Session } from './types.js';

export type SessionParams = {
  localAccount: LocalSessionAccount;
  remoteAccount: RemoteSessionAccount;
  statementStore: StatementStoreAdapter;
  encryption: Encryption;
  prover: StatementProver;
};

export function createSession({
  localAccount,
  remoteAccount,
  statementStore,
  encryption,
  prover,
}: SessionParams): Session {
  let subscriptions: VoidFunction[] = [];

  function submit(sessionId: SessionId, channel: Uint8Array, data: Uint8Array) {
    return encryption
      .encrypt(data)
      .map<Statement>(data => ({
        priority: getPriority(now()),
        channel: Binary.fromBytes(channel),
        topics: [Binary.fromBytes(sessionId)],
        data: Binary.fromBytes(data),
      }))
      .asyncAndThen(prover.generateMessageProof)
      .andThen(statementStore.submitStatement);
  }

  return {
    submitRequest<T>(codec: Codec<T>, message: T) {
      const requestId = nanoid();
      const sessionId = createSessionId(remoteAccount.publicKey, localAccount, remoteAccount);
      const statementDataCodec = StatementData(codec);

      const encode = fromThrowable(statementDataCodec.enc, toError);

      const rawData = encode({
        tag: 'request',
        value: { requestId, data: [message] },
      });

      return rawData
        .asyncAndThen(data => submit(sessionId, createRequestChannel(sessionId), data))
        .map(() => ({ requestId }));
    },

    submitResponse(requestId: string, responseCode: TransportError) {
      const sessionId = createSessionId(remoteAccount.publicKey, localAccount, remoteAccount);
      const statementDataCodec = StatementData(Bytes());

      const encode = fromThrowable(statementDataCodec.enc, toError);

      const rawData = encode({
        tag: 'response',
        value: { requestId, responseCode },
      });

      return rawData.asyncAndThen(data => submit(sessionId, createResponseChannel(sessionId), data));
    },

    subscribe<T>(codec: Codec<T>, callback: Callback<Message<T>[]>) {
      const statementDataCodec = StatementData(codec);
      const sessionId = createSessionId(remoteAccount.publicKey, remoteAccount, localAccount);

      return statementStore.subscribeStatements([sessionId], statements => {
        ResultAsync.combine(
          statements.map(statement => {
            if (!statement.data) return okAsync(null);

            const data = statement.data.asBytes();

            return prover
              .verifyMessageProof(statement)
              .andThen(verified => (verified ? ok() : err(new Error('Statement proof is not valid'))))
              .andThen(() => encryption.decrypt(data))
              .map(statementDataCodec.dec)
              .orElse(() => ok(null));
          }),
        )
          .map(messages => messages.filter(nonNullable).flatMap(toMessage))
          .andTee(messages => {
            if (messages.length > 0) {
              callback(messages);
            }
          });
      });
    },

    dispose() {
      for (const unsub of subscriptions) {
        unsub();
      }
      subscriptions = [];
    },
  };
}

function now() {
  const d1 = new Date();
  const d2 = new Date(
    d1.getUTCFullYear(),
    d1.getUTCMonth(),
    d1.getUTCDate(),
    d1.getUTCHours(),
    d1.getUTCMinutes(),
    d1.getUTCSeconds(),
  );
  return d2.getTime();
}

function getPriority(timestamp: number) {
  // time - (November 15, 2025)
  return Math.floor((timestamp - 1763154000000) / 1000);
}

function createRequestChannel(sessionId: Uint8Array) {
  return khash(sessionId, stringToBytes('request'));
}

function createResponseChannel(sessionId: Uint8Array) {
  return khash(sessionId, stringToBytes('response'));
}
