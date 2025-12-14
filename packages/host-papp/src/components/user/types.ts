import type { Identity } from '../../adapters/identity/types.js';
import type { EncrSecret, SsSecret } from '../../modules/crypto.js';
import type { Branded } from '../../types.js';

export type SessionTopic = Branded<Uint8Array, 'SessionTopic'>;

export type UserSession = {
  accountId: string;
  sessionTopic: SessionTopic;
};

export type UserSecrets = {
  encr: EncrSecret;
  ss: SsSecret;
};

export type User = UserSession & {
  identity: Identity | null;
};
