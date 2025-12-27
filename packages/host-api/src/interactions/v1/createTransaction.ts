import { Bytes, Enum, Result, Struct, Vector, _void, str, u32, u8 } from 'scale-ts';

import { GenericErr, Hex, Nullable } from '../commonCodecs.js';
import type { HexString } from '../types.js';

/**
 * createTransaction implementation
 * @see https://github.com/polkadot-js/api/issues/6213
 */

export const CreateTransactionErr = Enum({
  FailedToDecode: _void,
  Rejected: _void,
  // Failed to infer missing extensions, some extension is unsupported, etc.
  NotSupported: str,
  Unknown: GenericErr,
});

export interface TxPayloadV1Interface {
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

export const TxPayloadExtensionV1 = Struct({
  id: str,
  extra: Hex,
  additionalSigned: Hex,
});

export const TxPayloadContextV1 = Struct({
  metadata: Hex,
  tokenSymbol: str,
  tokenDecimals: u32,
  bestBlockHeight: u32,
});

export const TxPayloadV1 = Struct({
  signer: Nullable(str),
  callData: Hex,
  extensions: Vector(TxPayloadExtensionV1),
  txExtVersion: u8,
  context: TxPayloadContextV1,
});

export const VersionedTxPayload = Enum({
  v1: TxPayloadV1,
});

export const CreateTransactionV1_request = VersionedTxPayload;

export const CreateTransactionV1_response = Result(Bytes(), CreateTransactionErr);
