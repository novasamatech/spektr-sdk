import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';
import type { ResultAsync } from 'neverthrow';

export type StatementProver = {
  generateMessageProof(statement: Statement): ResultAsync<SignedStatement, Error>;
  verifyMessageProof(statement: Statement): ResultAsync<boolean, Error>;
};
