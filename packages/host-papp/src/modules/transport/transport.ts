import type { Statement } from '@polkadot-api/sdk-statement';
import { Result, fromThrowable, ok } from 'neverthrow';
import type { Codec, CodecType } from 'scale-ts';

import type { StatementAdapter } from '../../adapters/statement/types.js';
import { nonNullable, toError } from '../../helpers/utils.js';
import type { Callback } from '../../types.js';
import { decrypt } from '../crypto.js';
import { createSessionId } from '../session/helpers.js';
import type { Account } from '../session/types.js';

import type { TransportError } from './codec.js';
import { StatementData } from './codec.js';

export type Transport = ReturnType<typeof createTransport>;

type RequestMessage<T> = {
  type: 'request';
  requestId: string;
  data: T;
};

type ResponseMessage = {
  type: 'response';
  requestId: string;
  code: TransportError;
};

type Message<T> = RequestMessage<T> | ResponseMessage;

type Params = {
  adapter: StatementAdapter;
};

const decryptResults = fromThrowable(decrypt, toError);

function mapMessage<T>(statementData: CodecType<ReturnType<typeof StatementData<T>>>): Message<T>[] {
  switch (statementData.tag) {
    case 'request':
      return statementData.value.data.map((data, index) => ({
        type: 'request',
        requestId: `${statementData.value.requestId}-${index.toString()}`,
        data,
      }));
    case 'response':
      return [
        {
          type: 'response',
          requestId: statementData.value.requestId,
          code: statementData.value.responseCode,
        },
      ];
  }
}

export function createTransport({ adapter }: Params) {
  const transport = {
    subscribeSession(sessionId: Uint8Array, callback: Callback<Statement[]>) {
      return adapter.subscribeStatements([sessionId], callback);
    },

    subscribe<T>(ownAccount: Account, peerAccount: Account, codec: Codec<T>, callback: Callback<Message<T>[]>) {
      const sessionId = createSessionId(peerAccount, ownAccount);
      const statementDataCodec = StatementData(codec);

      return adapter.subscribeStatements([sessionId], statements => {
        Result.combine(
          statements.map(statement => {
            if (!statement.data) return ok(null);

            return decryptResults(peerAccount.publicKey, statement.data.asBytes())
              .map(statementDataCodec.dec)
              .orElse(() => ok(null));
          }),
        )
          .map(messages => messages.filter(nonNullable).flatMap(mapMessage))
          .andTee(messages => {
            if (messages.length > 0) {
              callback(messages);
            }
          });
      });
    },

    handleRequest<T>(
      ownAccount: Account,
      peerAccount: Account,
      codec: Codec<T>,
      callback: Callback<RequestMessage<T>>,
    ) {
      return transport.subscribe(ownAccount, peerAccount, codec, messages => {
        messages.filter(m => m.type === 'request').forEach(callback);
      });
    },
  };

  return transport;
}
