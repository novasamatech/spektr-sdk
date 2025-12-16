import type { ResultAsync } from 'neverthrow';

export type Identity = {
  accountId: string;
  fullUsername: string | null;
  liteUsername: string;
  credibility: string;
};

export type IdentityAdapter = {
  readIdentities(accounts: string[]): ResultAsync<Record<string, Identity | null>, Error>;
};
