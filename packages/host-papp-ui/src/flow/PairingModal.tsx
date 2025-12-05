import { memo } from 'react';

import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';

import { useSignInFlow } from './SignInStateProvider.js';

export const PairingModal = memo(() => {
  const signIn = useSignInFlow();
  const open = signIn.signInStatus.step !== 'none';

  const toggleModal = (open: boolean) => {
    if (!open) {
      signIn.abort();
    }
  };

  return (
    <Modal isOpen={open} onOpenChange={toggleModal} width={300}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: '16px', textAlign: 'center' }}>Sign in Polkadot app</span>
        {signIn.signInStatus.step === 'pairing' && <QrCode value={signIn.signInStatus.payload} size={270} />}
        {signIn.signInStatus.step === 'finished' && (
          <>
            <span>Welcome back, {signIn.identity?.liteUsername ?? 'User'}!</span>
          </>
        )}
      </div>
    </Modal>
  );
});
