import type { EncrSecret, SharedSecret, SsSecret } from '../../modules/crypto.js';

export type UserSecrets = {
  sharedSecret: SharedSecret;
  encr: EncrSecret;
  ss: SsSecret;
};
