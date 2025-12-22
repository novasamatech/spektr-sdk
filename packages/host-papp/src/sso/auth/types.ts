import type { StoredUserSession } from '../userSessionRepository.js';

export type AuthentificationStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'attestation' }
  | { step: 'pairing'; payload: string }
  | { step: 'error'; message: string }
  | { step: 'finished'; session: StoredUserSession };
