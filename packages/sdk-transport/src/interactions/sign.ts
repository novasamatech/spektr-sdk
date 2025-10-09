import type { SignerPayloadRaw, SignerPayloadJSON, SignerResult } from '@polkadot/types/types';
import { _void, bool, Bytes, type CodecType, Enum, Option, str, Struct, u32, Vector } from 'scale-ts';
import { hexEncoder } from '../commonEncoders';
import { createTransportEncoder } from '../createTransportEncoder';

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
