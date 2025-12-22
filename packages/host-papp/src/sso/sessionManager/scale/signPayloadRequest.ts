import type { CodecType } from 'scale-ts';
import { Option, Struct, Vector, bool, str, u32 } from 'scale-ts';

import { hexCodec } from './hex.js';

export type SignPayloadRequest = CodecType<typeof SignPayloadRequestCodec>;
export const SignPayloadRequestCodec = Struct({
  address: str,
  blockHash: hexCodec,
  blockNumber: hexCodec,
  era: hexCodec,
  genesisHash: hexCodec,
  method: str,
  nonce: hexCodec,
  specVersion: hexCodec,
  tip: hexCodec,
  transactionVersion: hexCodec,
  signedExtensions: Vector(str),
  version: u32,
  assetId: Option(hexCodec),
  mode: Option(u32),
  withSignedTransaction: Option(bool),
});
