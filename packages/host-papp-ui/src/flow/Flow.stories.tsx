import { createPappHostAdapter } from '@novasamatech/host-papp';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { useAuthenticateFlow } from './AuthProvider.js';
import { PairingModal } from './PairingModal.js';
import { PappProvider } from './PappProvider.js';
import { useUser } from './UserProvider.js';

const ConnectButton = () => {
  const auth = useAuthenticateFlow();
  const user = useUser();

  if (user.selectedUser) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{user.selectedUser.fullUsername ?? user.selectedUser.liteUsername}</span>
        <button onClick={() => user.selectedUser && auth.disconnect(user.selectedUser.accountId)}>Disconnect</button>
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
