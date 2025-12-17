import type { UserSession } from '../ssoSessionRepository.js';

export type AuthentificationStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'pairing'; payload: string }
  | { step: 'error'; message: string }
  | { step: 'finished'; session: UserSession };
