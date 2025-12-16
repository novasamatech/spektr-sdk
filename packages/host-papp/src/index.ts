import { createPappAdapter } from './papp.js';

export type { PappAdapter } from './papp.js';

export type { AuthentificationStatus } from './components/auth/types.js';
export type { UserSession } from './components/user/userSessionStorage.js';
export type { Identity } from './adapters/identity/types.js';

export function createPappHostAdapter(appId: string, metadata: string) {
  return createPappAdapter({
    appId,
    metadata,
  });
}
