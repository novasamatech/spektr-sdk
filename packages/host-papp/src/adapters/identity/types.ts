export type Identity = {
  fullUsername: string | null;
  liteUsername: string;
  credibility: string;
};

export type IdentityAdapter = {
  getIdentity(accountId: string): Promise<Identity | null>;
};
