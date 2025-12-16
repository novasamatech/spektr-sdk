import type { UserSession } from '../user/userSessionStorage.js';

export type AuthentificationStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'pairing'; payload: string }
  | { step: 'error'; message: string }
  | { step: 'finished'; session: UserSession };
