import type { ResultAsync } from 'neverthrow';
import type { Codec } from 'scale-ts';

import type { Callback } from '../types.js';

import type { TransportError } from './scale/statementData.js';

export type RequestMessage<T> = {
  type: 'request';
  requestId: string;
  data: T;
};

export type ResponseMessage = {
  type: 'response';
  requestId: string;
  code: TransportError;
};

export type Message<T> = RequestMessage<T> | ResponseMessage;

export type Session = {
  submitRequest<T>(codec: Codec<T>, data: T): ResultAsync<{ requestId: string }, Error>;
  submitResponse(requestId: string, responseCode: TransportError): ResultAsync<void, Error>;
  subscribe<T>(codec: Codec<T>, callback: Callback<Message<T>[]>): VoidFunction;
  dispose(): void;
};
