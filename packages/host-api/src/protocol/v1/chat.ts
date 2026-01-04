import { Enum, Option, Result, Struct, Vector, _void, str, u64 } from 'scale-ts';

import { GenericErr } from '../commonCodecs.js';

// contact

export class ChatContactRegistrationUnknownError extends Error {
  constructor(reason: string) {
    super(`Chat contact registration error: ${reason}`);
  }
}

export const ChatContactRegistrationErr = Enum({
  Unknown: GenericErr,
});

export const ChatContact = Struct({
  name: str,
  icon: str, // url or base64 encoded image for contact
});

export const ChatCreateContactV1_request = ChatContact;
export const ChatCreateContactV1_response = Result(_void, ChatContactRegistrationErr);

// message format

export const ChatAction = Struct({
  actionId: str,
  title: str,
});

export const ChatActionLayout = Enum({
  Column: _void,
  Grid: _void,
});

export const ChatActions = Struct({
  text: Option(str),
  actions: Vector(ChatAction),
  layout: ChatActionLayout,
});

export const ChatMedia = Struct({
  url: str,
});

export const ChatRichText = Struct({
  text: Option(str),
  media: Vector(ChatMedia),
});

export const ChatFile = Struct({
  url: str,
  fileName: str,
  mimeType: str,
  sizeBytes: u64,
  text: Option(str),
});

export const ChatReaction = Struct({
  messageId: str,
  emoji: str,
});

export const ChatMessage = Enum({
  Text: str,
  Actions: ChatActions,
  RichText: ChatMedia,
  File: ChatFile,
  Reaction: ChatReaction,
  ReactionRemoved: ChatReaction,
});

// sending message

export class ChatMessagePostingMessageTooLargeError extends Error {
  constructor() {
    super('Chat message posting error: message too large.');
  }
}

export class ChatMessagePostingUnknownError extends Error {
  constructor(reason: string) {
    super(`Chat message posting error: ${reason}`);
  }
}

export const ChatMessagePostingErr = Enum({
  MessageTooLarge: _void,
  Unknown: GenericErr,
});

export const ChatPostMessageResult = Struct({
  messageId: str,
});

export const ChatPostMessageV1_request = ChatMessage;
export const ChatPostMessageV1_response = Result(ChatPostMessageResult, ChatMessagePostingErr);

// receiving a message

export const ActionTrigger = Struct({
  messageId: str,
  actionId: str,
});

export const ReceivedChatAction = Enum({
  MessagePosted: ChatMessage,
  ActionTriggered: ActionTrigger,
});

export const ChatActionSubscribeV1_start = _void;
export const ChatActionSubscribeV1_receive = ReceivedChatAction;
