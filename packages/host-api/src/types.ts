import type {
  MessagePayloadSchema,
  MessageType,
  PickMessagePayload,
  PickMessagePayloadValue,
} from './messageEncoder.js';

export type HexString = `0x${string}`;

export type Logger = Record<'info' | 'warn' | 'error' | 'log', (...args: unknown[]) => void>;

export type TransportProvider = {
  logger: Logger;
  isCorrectEnvironment(): boolean;
  postMessage(message: Uint8Array): void;
  subscribe(callback: (message: Uint8Array) => void): () => void;
  dispose(): void;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type Transport = {
  readonly provider: TransportProvider;

  isCorrectEnvironment(): boolean;

  isReady(): Promise<boolean>;

  subscribeAny(callback: (id: string, payload: MessagePayloadSchema) => void): VoidFunction;

  subscribe<const Type extends MessageType>(
    type: Type,
    callback: (id: string, payload: PickMessagePayloadValue<Type>) => void,
  ): VoidFunction;

  postMessage(id: string, payload: MessagePayloadSchema): string;

  request<Response extends MessageType>(
    payload: MessagePayloadSchema,
    response: Response,
    abortSignal?: AbortSignal,
  ): Promise<PickMessagePayloadValue<Response>>;

  handleMessage<Request extends MessageType, Response extends MessageType>(
    type: Request,
    handler: (message: PickMessagePayloadValue<Request>) => Promise<PickMessagePayload<Response> | void>,
  ): VoidFunction;

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): VoidFunction;

  dispose(): void;
};
