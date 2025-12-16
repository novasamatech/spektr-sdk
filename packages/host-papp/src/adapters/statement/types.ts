import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';
import type { ResultAsync } from 'neverthrow';

import type { Callback } from '../../types.js';

export type StatementsCallback = Callback<Statement[]>;

export type StatementAdapter = {
  queryStatements(topics: Uint8Array[], destination?: Uint8Array): ResultAsync<Statement[], Error>;
  subscribeStatements(topics: Uint8Array[], callback: StatementsCallback): VoidFunction;
  submitStatement(statement: SignedStatement): ResultAsync<void, Error>;
};
