export type { ConnectionStatus, Logger, Transport } from './types.js';
export type { Provider } from './provider.js';
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

export { GenericError } from './protocol/commonCodecs.js';
export type { TxPayloadV1Interface } from './protocol/v1/createTransaction.js';
export { CreateTransactionErr } from './protocol/v1/createTransaction.js';
export { Account, AccountId, CreateProofErr, ProductAccountId, RequestCredentialsErr } from './protocol/v1/accounts.js';
export { ChatContactRegistrationErr, ChatMessagePostingErr } from './protocol/v1/chat.js';
export { HandshakeErr } from './protocol/v1/handshake.js';
export { PermissionErr } from './protocol/v1/permission.js';
export { SigningErr } from './protocol/v1/sign.js';
export { StatementProofErr } from './protocol/v1/statementStore.js';
export { StorageErr } from './protocol/v1/storage.js';
