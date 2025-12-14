import type { UserSession } from '../user/types.js';

export type AuthentificationStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'pairing'; payload: string }
  | { step: 'error'; message: string }
  | { step: 'finished'; user: UserSession };
