import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';

export type StatementAdapter = {
  getStatements(topics: Uint8Array[]): Promise<Statement[]>;
  subscribeStatements(topics: Uint8Array[], callback: (response: Statement[]) => unknown): VoidFunction;
  submitStatement(statement: SignedStatement): Promise<void>;
};
