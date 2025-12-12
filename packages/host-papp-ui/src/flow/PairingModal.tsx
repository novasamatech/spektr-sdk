import type { PropsWithChildren } from 'react';
import { memo, useMemo } from 'react';

import { Modal } from '../ui/Modal.js';
import { QrCode } from '../ui/QrCode.js';

import { useAuthenticateFlow } from './AuthProvider.js';
import { useUser } from './UserProvider.js';

const Text = ({ children }: PropsWithChildren) => (
  <span style={{ fontSize: '16px', textAlign: 'center', flexShrink: 0, color: 'white', fontFamily: 'sans-serif' }}>
    {children}
  </span>
);

export const PairingModal = memo(() => {
  const auth = useAuthenticateFlow();
  const user = useUser();
  const open = auth.status.step !== 'none';

  const toggleModal = (open: boolean) => {
    if (!open) {
      auth.abortAuthentication();
    }
  };

  console.log('users', user.users);

  const signedInUser = useMemo(() => {
    if (auth.status.step === 'finished') {
      const accountId = auth.status.user.accountId;
      return user.users.find(x => x.accountId === accountId);
    }

    return null;
  }, [auth.status.step, user.users]);

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
        {auth.status.step === 'pairing' && <QrCode value={auth.status.payload} size={270} />}
        {auth.status.step === 'finished' && (
          <>
            <Text>Welcome back, {signedInUser?.liteUsername ?? 'User'}!</Text>
          </>
        )}
      </div>
    </Modal>
  );
});
