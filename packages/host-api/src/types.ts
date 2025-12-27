import type {
  ComposeMessageAction,
  MessageActionByVersion,
  MessagePayloadSchema,
  MessageVersion,
  PickMessagePayload,
  PickMessagePayloadValue,
} from './interactions/message.js';

export type Logger = Record<'info' | 'warn' | 'error' | 'log', (...args: unknown[]) => void>;

export type TransportProvider = {
  logger: Logger;
  isCorrectEnvironment(): boolean;
  postMessage(message: Uint8Array): void;
  subscribe(callback: (message: Uint8Array) => void): () => void;
  dispose(): void;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type SubscriptionHandler<V extends MessageVersion, Method extends string> = (
  params: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'start'>>,
  send: (value: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'receive'>>) => void,
) => VoidFunction;

export type TransportRequester<
  V extends MessageVersion,
  Request extends MessageActionByVersion<V>,
  Response extends MessageActionByVersion<V>,
> = {
  request(
    payload: PickMessagePayloadValue<V, Request>,
    signal?: AbortSignal,
  ): Promise<PickMessagePayloadValue<V, Response>>;
};

export type Transport = {
  readonly provider: TransportProvider;

  isCorrectEnvironment(): boolean;
  isReady(): Promise<boolean>;
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): VoidFunction;
  dispose(): void;

  request<const V extends MessageVersion, const Method extends string>(
    version: V,
    method: Method,
    payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'request'>>,
    signal?: AbortSignal,
  ): Promise<PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'response'>>>;

  handleRequest<const V extends MessageVersion, const Method extends string>(
    version: V,
    method: Method,
    handler: (
      message: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'request'>>,
    ) => Promise<PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'response'>>>,
  ): VoidFunction;

  subscribe<const V extends MessageVersion, const Method extends string>(
    version: V,
    method: Method,
    payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'start'>>,
    callback: (payload: PickMessagePayloadValue<V, ComposeMessageAction<V, Method, 'receive'>>) => void,
  ): VoidFunction;

  handleSubscription<const V extends MessageVersion, const Method extends string>(
    version: V,
    method: Method,
    handler: SubscriptionHandler<V, Method>,
  ): VoidFunction;

  // low level method, use on your own risk
  postMessage(requestId: string, payload: MessagePayloadSchema): void;

  // low level method, use on your own risk
  listenMessages<const V extends MessageVersion, const Action extends MessageActionByVersion<V>>(
    version: V,
    action: Action,
    callback: (requestId: string, data: PickMessagePayload<V, Action>) => void,
  ): VoidFunction;
};
