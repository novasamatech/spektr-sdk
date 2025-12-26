import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';
import type { ResultAsync } from 'neverthrow';

export type StatementStoreAdapter = {
  queryStatements(topics: Uint8Array[], destination?: Uint8Array): ResultAsync<Statement[], Error>;
  subscribeStatements(topics: Uint8Array[], callback: (statements: Statement[]) => unknown): VoidFunction;
  submitStatement(statement: SignedStatement): ResultAsync<void, Error>;
};
