import type { PropsWithChildren } from 'react';
import { memo } from 'react';

import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';

import { useSignInFlow } from './SignInStateProvider.js';

const Text = ({ children }: PropsWithChildren) => (
  <span style={{ fontSize: '16px', textAlign: 'center', flexShrink: 0, color: 'white', fontFamily: 'sans-serif' }}>
    {children}
  </span>
);

export const PairingModal = memo(() => {
  const signIn = useSignInFlow();
  const open = signIn.signInStatus.step !== 'none' && signIn.initiatedByUser;

  const toggleModal = (open: boolean) => {
    if (!open) {
      signIn.abort();
    }
  };

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
        {signIn.signInStatus.step === 'pairing' && <QrCode value={signIn.signInStatus.payload} size={270} />}
        {signIn.signInStatus.step === 'finished' && (
          <>
            <Text>Welcome back, {signIn.identity?.liteUsername ?? 'User'}!</Text>
          </>
        )}
      </div>
    </Modal>
  );
});
