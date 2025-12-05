import { createPappHostAdapter } from '@novasamatech/host-papp';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PairingModal } from './PairingModal.js';
import { PappProvider } from './PappProvider.js';
import { useSignInFlow } from './SignInStateProvider.js';

const ConnectButton = () => {
  const signIn = useSignInFlow();

  return (
    <button onClick={() => signIn.signIn()}>
      {signIn.identity ? signIn.identity.liteUsername : 'Connect Polkadot'}
    </button>
  );
};

const meta: Meta<typeof PappProvider> = {
  component: PappProvider,
  title: 'flow/PappProvider',
  args: {
    adapter: createPappHostAdapter('https://test.com', 'https://example.com'),
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
