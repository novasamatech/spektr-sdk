import { Enum, Option, Result, Struct, Vector, _void, str, u64 } from 'scale-ts';

import { ErrEnum, GenericErr } from '../commonCodecs.js';

// contact

export const ChatContactRegistrationErr = ErrEnum({
  Unknown: [GenericErr, 'Unknown error while chat registration'],
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
  RichText: ChatRichText,
  Actions: ChatActions,
  File: ChatFile,
  Reaction: ChatReaction,
  ReactionRemoved: ChatReaction,
});

// sending message

export const ChatMessagePostingErr = ErrEnum({
  MessageTooLarge: [_void, 'ChatMessagePosting: message too large'],
  Unknown: [GenericErr, 'ChatMessagePosting: unknown error'],
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
