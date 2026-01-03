import type { SignedStatement, Statement } from '@polkadot-api/sdk-statement';
import type { ResultAsync } from 'neverthrow';

export type StatementStoreAdapter = {
  queryStatements(topics: Uint8Array[], destination?: Uint8Array): ResultAsync<Statement[], Error>;
  subscribeStatements(topics: Uint8Array[], callback: (statements: Statement[]) => unknown): VoidFunction;
  submitStatement(
    statement: SignedStatement,
  ): ResultAsync<
    void,
    | DataTooLargeError
    | PriorityTooLowError
    | AccountFullError
    | StorageFullError
    | NoProofError
    | BadProofError
    | EncodingTooLargeError
    | Error
  >;
};

export class DataTooLargeError extends Error {
  public readonly submitted: number;
  public readonly available: number;
  constructor(submitted: number, available: number) {
    super(`Submit failed, data too large: ${submitted} > ${available}`);
    this.submitted = submitted;
    this.available = available;
  }
}

export class PriorityTooLowError extends Error {
  public readonly submitted: number;
  public readonly min: number;
  constructor(submitted: number, min: number) {
    super(`Submit failed, priority too low: ${submitted} > ${min}`);
    this.submitted = submitted;
    this.min = min;
  }
}

export class AccountFullError extends Error {
  constructor() {
    super(`Submit failed, account full`);
  }
}

export class StorageFullError extends Error {
  constructor() {
    super(`Submit failed, storage is full`);
  }
}

export class NoProofError extends Error {
  constructor() {
    super(`Submit failed, no proof provided`);
  }
}

export class BadProofError extends Error {
  constructor() {
    super(`Submit failed, bad proof provided`);
  }
}

export class EncodingTooLargeError extends Error {
  public readonly submitted: number;
  public readonly max: number;
  constructor(submitted: number, max: number) {
    super(`Submit failed, encoding too large`);
    this.submitted = submitted;
    this.max = max;
  }
}
