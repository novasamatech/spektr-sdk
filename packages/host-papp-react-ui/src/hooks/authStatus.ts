import { useMemo } from 'react';

import { useAuthentication } from '../providers/AuthProvider.js';

export const useAuthStatus = () => {
  const auth = useAuthentication();
  const { pairingStatus, attestationStatus } = auth;

  const guestUsername = attestationStatus.step === 'attestation' ? attestationStatus.username : null;

  const signedInUser = useMemo(() => {
    if (pairingStatus.step === 'finished') {
      return pairingStatus.session;
    }
    return null;
  }, [pairingStatus.step]);

  const status = useMemo(() => {
    if (pairingStatus.step === 'none') {
      return pairingStatus;
    }
    if (pairingStatus.step === 'initial') {
      return pairingStatus;
    }
    if (pairingStatus.step === 'pairing') {
      return pairingStatus;
    }
    if (attestationStatus.step === 'attestation') {
      return attestationStatus;
    }
    if (attestationStatus.step === 'attestationError') {
      return attestationStatus;
    }
    return pairingStatus;
  }, [pairingStatus, attestationStatus]);

  return {
    status,
    guestUsername,
    signedInUser,
  };
};
