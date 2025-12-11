import type { Result } from '../../helpers/result.js';

export type Identity = {
  accountId: string;
  fullUsername: string | null;
  liteUsername: string;
  credibility: string;
};

export type IdentityAdapter = {
  readIdentities(accounts: string[]): Promise<Result<Record<string, Identity | null>, Error>>;
};
