import { createTransport } from '@novasamatech/host-api';
import { createContainer } from '@novasamatech/host-container';
import type { ChatMessage } from '@novasamatech/product-sdk';
import { createChat } from '@novasamatech/product-sdk';

import { describe, expect, it, vi } from 'vitest';

import { createHostApiProviders } from './__mocks__/hostApiProviders.js';

function setup() {
  const providers = createHostApiProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);
  const chat = createChat(sdkTransport);

  return { container, chat };
}

describe('Host API: Chat', () => {
  it('should register chat', async () => {
    const { container, chat } = setup();
    const registrationInfo = { name: 'test chat', icon: 'http://product.com/icon.png' };

    const handler = vi.fn<Parameters<typeof container.handleChatCreateContact>[0]>((_, { ok }) => ok('New'));
    container.handleChatCreateContact(handler);

    await chat.register(registrationInfo);

    expect(handler).toBeCalledWith(registrationInfo, { ok: expect.any(Function), err: expect.any(Function) });
  });

  it('should send message', async () => {
    const { container, chat } = setup();
    const registrationInfo = { name: 'test chat', icon: 'http://product.com/icon.png' };
    const message: ChatMessage = {
      tag: 'Text',
      value: 'test message',
    };
    const response = { messageId: 'hello' };

    container.handleChatCreateContact((_, { ok }) => ok('New'));
    const handler = vi.fn<Parameters<typeof container.handleChatPostMessage>[0]>((_, { ok }) => ok(response));
    container.handleChatPostMessage(handler);

    await chat.register(registrationInfo);
    const result = await chat.sendMessage(message);

    expect(handler).toBeCalledWith(message, { ok: expect.any(Function), err: expect.any(Function) });
    expect(result).toEqual(response);
  });

  it('should react to message', async () => {
    const { container, chat } = setup();
    const registrationInfo = { name: 'test chat', icon: 'http://product.com/icon.png' };
    const message: ChatMessage = {
      tag: 'Text',
      value: 'test message',
    };

    container.handleChatCreateContact((_, { ok }) => ok('New'));
    container.handleChatActionSubscribe((_, send) => {
      // sending back and forth
      return container.handleChatPostMessage((message, { ok }) => {
        send({ tag: 'MessagePosted', value: message });
        return ok({ messageId: 'hello' });
      });
    });

    const handler = vi.fn();

    chat.subscribeAction(handler);

    await chat.register(registrationInfo);
    await chat.sendMessage(message);

    expect(handler).toBeCalledWith({ tag: 'MessagePosted', value: message });
  });
});
