import { createPappAdapter } from './papp.js';

export type { PappAdapter } from './papp.js';

export type { SignInStatus } from './modules/signIn.js';
export type { Identity } from './adapters/identity/types.js';

export function createPappHostAdapter(appId: string, metadata: string) {
  return createPappAdapter({
    appId,
    metadata,
  });
}
