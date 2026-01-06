import type { Meta, StoryObj } from '@storybook/react-vite';

import { QrCode } from './QrCode.js';

const meta: Meta<typeof QrCode> = {
  component: QrCode,
  title: 'QrCode',
};

export default meta;

type Story = StoryObj<typeof QrCode>;

export const Default: Story = {
  args: {
    value:
      'polkadotapp://pair?handshake=0x00e644cc1c5ff7ac684a88cb073c41aee755307a4422c3e040b79f37429ed0f9590416124abe8bd8443937c6c3d74bd695cda665e2ae096255b43b38b9095f31132774005238b2c736483ade8d85420be11d9069c41325633bfd8729428074c87010',
    size: 270,
  },
};
