export type { ConnectionStatus, Logger, Transport, TransportProvider } from './types.js';
export {
  assertEnumVariant,
  createRequestId,
  enumValue,
  errResult,
  fromHex,
  isEnumVariant,
  okResult,
  toHex,
  unwrapResultOrThrow,
} from './helpers.js';

export type { HexString } from './protocol/types.js';

export { createHostApi } from './hostApi.js';
export { createTransport } from './transport.js';
export { createDefaultLogger } from './logger.js';

export type { MessageAction, PickMessagePayload, PickMessagePayloadValue } from './protocol/messageCodec.js';

// External reexports
export type { CodecType } from 'scale-ts';

// Codecs

export type { TxPayloadV1Interface } from './protocol/v1/createTransaction.js';
export {
  CreateTransactionV1_request,
  CreateTransactionV1_response,
  CreateTransactionWithNonProductAccountV1_request,
  CreateTransactionWithNonProductAccountV1_response,
} from './protocol/v1/createTransaction.js';
export { Account, AccountId, ProductAccountId } from './protocol/v1/accounts.js';
