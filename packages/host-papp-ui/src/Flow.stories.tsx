import { createPappHostAdapter } from '@novasamatech/host-papp';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PairingModal } from './flow/PairingModal.js';
import { PappProvider } from './flow/PappProvider.js';
import { useSessionIdentity } from './hooks/identity.js';
import { useAuthenticateFlow } from './providers/AuthProvider.js';
import { useSession } from './providers/SessionsProvider.js';

const ConnectButton = () => {
  const auth = useAuthenticateFlow();
  const { session } = useSession();
  const [identity, pending] = useSessionIdentity(session);

  if (session) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{identity?.fullUsername ?? identity?.liteUsername ?? (pending ? 'Loading...' : 'Unknown user')}</span>
        <button onClick={() => auth.disconnect(session)}>Disconnect</button>
      </div>
    );
  }

  return <button onClick={() => auth.authenticate()}>Connect Polkadot</button>;
};

const meta: Meta<typeof PappProvider> = {
  component: PappProvider,
  title: 'flow/PappProvider',
  args: {
    adapter: createPappHostAdapter('https://test.com', 'https://shorturl.at/zGkir'),
  },
  render({ adapter }) {
    return (
      <>
        <PappProvider adapter={adapter}>
          <ConnectButton />
          <PairingModal />
        </PappProvider>
      </>
    );
  },
};

export default meta;

type Story = StoryObj<typeof PappProvider>;

export const Default: Story = {};
