import type { ResultAsync } from 'neverthrow';
import type { Codec } from 'scale-ts';

import type { Callback } from '../types.js';

import type { DecodingError } from './error.js';
import { DecryptionError, UnknownError } from './error.js';
import type { ResponseCode } from './scale/statementData.js';

export type RequestMessage<T> = {
  type: 'request';
  localId: string;
  requestId: string;
  payload: T;
};

export type ResponseMessage = {
  type: 'response';
  localId: string;
  requestId: string;
  responseCode: ResponseCode;
};

export type Message<T> = RequestMessage<T> | ResponseMessage;

export type Session = {
  request<T>(codec: Codec<T>, payload: T): ResultAsync<void, DecodingError | DecryptionError | UnknownError | Error>;

  submitRequestMessage<T>(codec: Codec<T>, payload: T): ResultAsync<{ requestId: string }, Error>;
  submitResponseMessage(requestId: string, responseCode: ResponseCode): ResultAsync<void, Error>;
  waitForRequestMessage<T>(codec: Codec<T>, filter: (message: T) => boolean): ResultAsync<RequestMessage<T>, Error>;
  waitForResponseMessage(requestId: string): ResultAsync<ResponseMessage, Error>;
  subscribe<T>(codec: Codec<T>, callback: Callback<Message<T>[]>): VoidFunction;
  dispose(): void;
};
