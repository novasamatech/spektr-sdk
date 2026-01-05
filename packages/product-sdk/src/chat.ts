import type {
  ChatMessage as ChatMessageCodec,
  CodecType,
  ReceivedChatAction as ReceivedChatActionCodec,
  Transport,
} from '@novasamatech/host-api';
import { createHostApi, enumValue } from '@novasamatech/host-api';

import { defaultTransport } from './defaultTransport.js';
import { promiseWithResolvers } from './helpers.js';

promiseWithResolvers();

export type ChatMessage = CodecType<typeof ChatMessageCodec>;
export type ReceivedChatAction = CodecType<typeof ReceivedChatActionCodec>;

export const createChat = (transport: Transport = defaultTransport) => {
  const hostApi = createHostApi(transport);
  let registered = false;

  const messageQueue: {
    message: ChatMessage;
    resolve: (response: { messageId: string }) => void;
    reject: (reason: unknown) => void;
  }[] = [];

  const chat = {
    async register(params: { name: string; icon: string }) {
      if (registered) {
        return;
      }

      const result = await hostApi.chat_create_contact({ tag: 'v1', value: params });

      return result
        .andTee(() => (registered = true))
        .match(
          () => {
            if (messageQueue.length > 0) {
              messageQueue.forEach(({ message, resolve, reject }) => {
                chat.sendMessage(message).then(resolve, reject);
              });
              messageQueue.length = 0;
            }
          },
          err => {
            throw err.value;
          },
        );
    },
    async sendMessage(message: ChatMessage) {
      if (registered) {
        const result = await hostApi.chat_post_message(enumValue('v1', message));

        return result.match(
          payload => {
            if (payload.tag === 'v1') {
              return { messageId: payload.value.messageId };
            } else {
              throw new Error(`Unknown message version ${payload.tag}`);
            }
          },
          err => {
            throw err.value;
          },
        );
      } else {
        const { promise, resolve, reject } = promiseWithResolvers<{ messageId: string }>();
        messageQueue.push({ message, resolve, reject });
        return promise;
      }
    },
    subscribeAction(callback: (action: ReceivedChatAction) => void) {
      return hostApi.chat_action_subscribe(enumValue('v1', undefined), action => {
        if (action.tag === 'v1') {
          callback(action.value);
        }
      });
    },
  };

  return chat;
};
