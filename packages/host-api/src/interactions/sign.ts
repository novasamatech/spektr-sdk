import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import type { CodecType } from 'scale-ts';
import { Bytes, Enum, Option, Struct, Vector, _void, bool, str, u16, u32 } from 'scale-ts';

import { hexEncoder } from '../commonEncoders';
import { createTransportEncoder } from '../createTransportEncoder';
import type { HexString } from '../types';

const signRawRequestCodec = Struct({
  address: str,
  data: str,
  type: Enum({
    bytes: _void,
    payload: _void,
  }),
});

/**
 * @see {import('@polkadot/types/types').SignerPayloadRaw}
 */
export type SignRawRequestSchema = CodecType<typeof signRawRequestV1Encoder>;
export const signRawRequestV1Encoder = createTransportEncoder<SignerPayloadRaw, typeof signRawRequestCodec>({
  codec: signRawRequestCodec,
  from(decoded) {
    return {
      address: decoded.address,
      data: decoded.data,
      type: decoded.type.tag,
    };
  },
  to(value) {
    return {
      address: value.address,
      data: value.data,
      type: {
        tag: value.type,
        value: undefined,
      },
    };
  },
});

/**
 * @see {import('@polkadot/types/types').SignerPayloadJSON}
 */
export type SignPayloadRequestSchema = CodecType<typeof signPayloadRequestV1Encoder>;
export const signPayloadCodec = Struct({
  address: str,
  assetId: Option(hexEncoder),
  blockHash: hexEncoder,
  blockNumber: hexEncoder,
  era: hexEncoder,
  genesisHash: hexEncoder,
  metadataHash: Option(hexEncoder),
  method: str,
  mode: Option(u32),
  nonce: hexEncoder,
  specVersion: hexEncoder,
  tip: hexEncoder,
  transactionVersion: hexEncoder,
  signedExtensions: Vector(str),
  version: u32,
  withSignedTransaction: Option(bool),
});

export const signPayloadRequestV1Encoder = createTransportEncoder<SignerPayloadJSON, typeof signPayloadCodec>({
  codec: signPayloadCodec,
  from(decoded) {
    return {
      address: decoded.address,
      assetId: decoded.assetId,
      blockHash: decoded.blockHash,
      blockNumber: decoded.blockNumber,
      era: decoded.era,
      genesisHash: decoded.genesisHash,
      metadataHash: decoded.metadataHash,
      method: decoded.method,
      mode: decoded.mode,
      nonce: decoded.nonce,
      specVersion: decoded.specVersion,
      tip: decoded.tip,
      transactionVersion: decoded.transactionVersion,
      signedExtensions: decoded.signedExtensions,
      version: decoded.version,
      withSignedTransaction: decoded.withSignedTransaction,
    };
  },
  to(value) {
    return {
      address: value.address,
      assetId: value.assetId,
      blockHash: value.blockHash,
      blockNumber: value.blockNumber,
      era: value.era,
      genesisHash: value.genesisHash,
      metadataHash: value.metadataHash,
      method: value.method,
      mode: value.mode,
      nonce: value.nonce,
      specVersion: value.specVersion,
      tip: value.tip,
      transactionVersion: value.transactionVersion,
      signedExtensions: value.signedExtensions,
      version: value.version,
      withSignedTransaction: value.withSignedTransaction,
    };
  },
});

const signResult = Struct({
  id: u32,
  signature: hexEncoder,
  signedTransaction: Option(
    Enum({
      hex: hexEncoder,
      buffer: Bytes(),
    }),
  ),
});

export const signResponseV1Encoder = createTransportEncoder<SignerResult, typeof signResult>({
  codec: signResult,
  from(decoded) {
    return {
      id: decoded.id,
      signature: decoded.signature,
      signedTransaction: decoded.signedTransaction ? decoded.signedTransaction.value : undefined,
    };
  },
  to(value) {
    let signedTransaction: CodecType<typeof signResult>['signedTransaction'] = undefined;
    if (value.signedTransaction) {
      if (typeof value.signedTransaction === 'string') {
        signedTransaction = {
          tag: 'hex',
          value: value.signedTransaction,
        };
      } else {
        signedTransaction = {
          tag: 'buffer',
          value: value.signedTransaction,
        };
      }
    }

    return {
      id: value.id,
      signature: value.signature,
      signedTransaction: signedTransaction,
    };
  },
});

/**
 * createTransaction implementation
 * @see https://github.com/polkadot-js/api/issues/6213
 */

export interface TxPayloadV1 {
  /** Payload version. MUST be 1. */
  version: 1;

  /**
   * Signer selection hint. Allows the implementer to identify which private-key / scheme to use.
   * - Use a wallet-defined handle (e.g., address/SS58, account-name, etc). This identifier
   * was previously made available to the consumer.
   * - Set `null` to let the implementer pick the signer (or if the signer is implied).
   */
  signer: string | null;

  /**
   * SCALE-encoded Call (module indicator + function indicator + params).
   */
  callData: HexString;

  /**
   * Transaction extensions supplied by the caller (order irrelevant).
   * The consumer SHOULD provide every extension that is relevant to them.
   * The implementer MAY infer missing ones.
   */
  extensions: Array<{
    /** Identifier as defined in metadata (e.g., "CheckSpecVersion", "ChargeAssetTxPayment"). */
    id: string;

    /**
     * Explicit "extra" to sign (goes into the extrinsic body).
     * SCALE-encoded per the extension's "extra" type as defined in the metadata.
     */
    extra: HexString;

    /**
     * "Implicit" data to sign (known by the chain, not included into the extrinsic body).
     * SCALE-encoded per the extension's "additionalSigned" type as defined in the metadata.
     */
    additionalSigned: HexString;
  }>;

  /**
   * Transaction Extension Version.
   * - For Extrinsic V4 MUST be 0.
   * - For Extrinsic V5, set to any version supported by the runtime.
   * The implementer:
   *  - MUST use this field to determine the required extensions for creating the extrinsic.
   *  - MAY use this field to infer missing extensions that the implementer could know how to handle.
   */
  txExtVersion: number;

  /**
   * Context needed for decoding, display, and (optionally) inferring certain extensions.
   */
  context: {
    /**
     * RuntimeMetadataPrefixed blob (SCALE), starting with ASCII "meta" magic (`0x6d657461`),
     * then a metadata version (V14+). For V5+ versioned extensions, MUST provide V16+.
     */
    metadata: HexString;

    /**
     * Native token display info (used by some implementers), also needed to compute
     * the `CheckMetadataHash` value.
     */
    tokenSymbol: string;
    tokenDecimals: number;

    /**
     * Highest known block number to aid mortality UX.
     */
    bestBlockHeight: number;
  };
}

const createTransactionRequestCodec = Struct({
  version: u16,
  signer: Option(str),
  callData: hexEncoder,
  extensions: Vector(
    Struct({
      id: str,
      extra: hexEncoder,
      additionalSigned: hexEncoder,
    }),
  ),
  txExtVersion: u16,
  context: Struct({
    metadata: hexEncoder,
    tokenSymbol: str,
    tokenDecimals: u32,
    bestBlockHeight: u32,
  }),
});

export const createTransactionRequestV1Encoder = createTransportEncoder<
  TxPayloadV1,
  typeof createTransactionRequestCodec
>({
  codec: createTransactionRequestCodec,
  from({ version, signer, ...rest }) {
    if (version !== 1) {
      throw new Error(`TxPayload supported version are: 1. Got ${version}`);
    }

    return {
      version,
      signer: signer ?? null,
      ...rest,
    };
  },
  to({ signer, ...rest }) {
    return {
      signer: signer ?? undefined,
      ...rest,
    };
  },
});

export const createTransactionResponseV1Encoder = hexEncoder;
