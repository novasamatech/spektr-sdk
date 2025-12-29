import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button.js';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Button',
  decorators: [
    Story => (
      <div style={{ padding: 20, background: 'black', color: 'white' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Hello!',
    onClick: () => alert('Clicked'),
  },
};
