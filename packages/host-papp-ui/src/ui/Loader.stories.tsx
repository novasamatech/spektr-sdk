import type { Meta, StoryObj } from '@storybook/react-vite';

import { Loader } from './Loader.js';

const meta: Meta<typeof Loader> = {
  component: Loader,
  title: 'Loader',
  args: {
    size: 16,
  },
};

export default meta;

type Story = StoryObj<typeof Loader>;

export const Default: Story = {};

export const CustomSize: Story = {
  args: {
    size: 40,
  },
};

export const CustomColor: Story = {
  decorators: [
    Story => (
      <div style={{ padding: 20, background: 'black', color: 'white', width: 'fit-content' }}>
        <Story />
      </div>
    ),
  ],
};
