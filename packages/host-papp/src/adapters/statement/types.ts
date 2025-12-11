import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';

import type { Result } from '../../helpers/result.js';

export type StatementAdapter = {
  getStatements(topics: Uint8Array[]): Promise<Result<Statement[], Error>>;
  subscribeStatements(topics: Uint8Array[], callback: (response: Statement[]) => unknown): VoidFunction;
  submitStatement(statement: SignedStatement): Promise<Result<void, Error>>;
};
