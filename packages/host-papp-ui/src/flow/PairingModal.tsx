import type { PropsWithChildren } from 'react';
import { memo, useMemo } from 'react';

import { useIdentity } from '../hooks/identity.js';
import { useAuthentication } from '../providers/AuthProvider.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';

const Text = ({ children }: PropsWithChildren) => (
  <span style={{ fontSize: '16px', textAlign: 'center', flexShrink: 0, color: 'white', fontFamily: 'sans-serif' }}>
    {children}
  </span>
);

export const PairingModal = memo(() => {
  const auth = useAuthentication();
  const open = auth.status.step !== 'none';

  const toggleModal = (open: boolean) => {
    if (!open) {
      auth.abortAuthentication();
    }
  };

  const signedInUser = useMemo(() => {
    if (auth.status.step === 'finished') {
      return auth.status.session;
    }
    return null;
  }, [auth.status.step]);

  const [identity, identityPending] = useIdentity(signedInUser?.remoteAccount.accountId ?? null);

  return (
    <Modal isOpen={open} onOpenChange={toggleModal} width={300}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          paddingInline: 8,
          paddingBlock: 16,
          alignItems: 'center',
        }}
      >
        <Text>Sign in Polkadot app</Text>
        {auth.status.step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text>Error: {auth.status.message}</Text>
            <Button onClick={() => auth.authenticate()}>Retry</Button>
          </div>
        )}
        {auth.status.step === 'attestation' && <Text>Loading...</Text>}
        {auth.status.step === 'pairing' && <QrCode value={auth.status.payload} size={270} />}
        {auth.status.step === 'finished' && (
          <>
            <Text>Welcome back, {identity?.liteUsername ?? (identityPending ? '...' : 'user')}!</Text>
          </>
        )}
      </div>
    </Modal>
  );
});
