import type { EncrSecret, SharedSecret, SsSecret } from '../../crypto.js';

export type UserSecrets = {
  sharedSecret: SharedSecret;
  encr: EncrSecret;
  ss: SsSecret;
};
