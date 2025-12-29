import type { StoredUserSession } from '../userSessionRepository.js';

export type PairingStatus =
  | { step: 'none' }
  | { step: 'initial' }
  | { step: 'attestation' }
  | { step: 'pairing'; payload: string }
  | { step: 'pairingError'; message: string }
  | { step: 'finished'; session: StoredUserSession };

export type AttestationStatus =
  | { step: 'none' }
  | { step: 'attestation'; username: string }
  | { step: 'attestationError'; message: string }
  | { step: 'finished' };
