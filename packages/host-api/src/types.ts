import type {
  ComposeMessageAction,
  MessageAction,
  MessagePayloadSchema,
  PickMessagePayload,
  PickMessagePayloadValue,
} from './protocol/messageCodec.js';

export type Logger = Record<'info' | 'warn' | 'error' | 'log', (...args: unknown[]) => void>;

export type TransportProvider = {
  logger: Logger;
  isCorrectEnvironment(): boolean;
  postMessage(message: Uint8Array): void;
  subscribe(callback: (message: Uint8Array) => void): () => void;
  dispose(): void;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type RequestHandler<Method extends string> = (
  message: PickMessagePayloadValue<ComposeMessageAction<Method, 'request'>>,
) => Promise<PickMessagePayloadValue<ComposeMessageAction<Method, 'response'>>>;

export type SubscriptionHandler<Method extends string> = (
  params: PickMessagePayloadValue<ComposeMessageAction<Method, 'start'>>,
  send: (value: PickMessagePayloadValue<ComposeMessageAction<Method, 'receive'>>) => void,
) => VoidFunction;

export type Transport = {
  readonly provider: TransportProvider;

  isCorrectEnvironment(): boolean;
  isReady(): Promise<boolean>;
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): VoidFunction;
  dispose(): void;

  request<const Method extends string>(
    method: Method,
    payload: PickMessagePayloadValue<ComposeMessageAction<Method, 'request'>>,
    signal?: AbortSignal,
  ): Promise<PickMessagePayloadValue<ComposeMessageAction<Method, 'response'>>>;

  handleRequest<const Method extends string>(method: Method, handler: RequestHandler<Method>): VoidFunction;

  subscribe<const Method extends string>(
    method: Method,
    payload: PickMessagePayloadValue<ComposeMessageAction<Method, 'start'>>,
    callback: (payload: PickMessagePayloadValue<ComposeMessageAction<Method, 'receive'>>) => void,
  ): VoidFunction;

  handleSubscription<const Method extends string>(method: Method, handler: SubscriptionHandler<Method>): VoidFunction;

  // low level method, use on your own risk
  postMessage(requestId: string, payload: MessagePayloadSchema): void;

  // low level method, use on your own risk
  listenMessages<const Action extends MessageAction>(
    action: Action,
    callback: (requestId: string, data: PickMessagePayload<Action>) => void,
  ): VoidFunction;
};
