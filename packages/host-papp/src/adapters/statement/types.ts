import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';

import type { Result } from '../../helpers/result.js';

export type StatementsCallback = (statements: Statement[]) => unknown;

export type StatementAdapter = {
  getStatements(topics: Uint8Array[]): Promise<Result<Statement[], Error>>;
  subscribeStatements(topics: Uint8Array[], callback: StatementsCallback): VoidFunction;
  submitStatement(statement: SignedStatement): Promise<Result<void, Error>>;
};
