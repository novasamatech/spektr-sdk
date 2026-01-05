import { Bytes, Enum, Option, Result, Struct, Vector, _void, bool, str, u32 } from 'scale-ts';

import { ErrEnum, GenericErr, GenesisHash, Hex } from '../commonCodecs.js';

// common structures

export const SigningErr = ErrEnum({
  FailedToDecode: [_void, 'Signing: failed to decode'],
  Rejected: [_void, 'Signing: rejected'],
  Unknown: [GenericErr, 'Signing: unknown error'],
});

export const SigningResult = Struct({
  signature: Hex(),
  signedTransaction: Option(Hex()),
});

// sign raw

const SigningRawPayload = Struct({
  address: str,
  data: Enum({
    Bytes: Bytes(),
    Payload: str,
  }),
});

export const SignRawV1_request = SigningRawPayload;
export const SignRawV1_response = Result(SigningResult, SigningErr);

// sign payload

export const SigningPayload = Struct({
  address: str,
  blockHash: Hex(),
  blockNumber: Hex(),
  era: Hex(),
  genesisHash: GenesisHash,
  method: Hex(),
  nonce: Hex(),
  specVersion: Hex(),
  tip: Hex(),
  transactionVersion: Hex(),
  signedExtensions: Vector(str),
  version: u32,
  assetId: Option(Hex()),
  metadataHash: Option(Hex()),
  mode: Option(u32),
  withSignedTransaction: Option(bool),
});

export const SignPayloadV1_request = SigningPayload;
export const SignPayloadV1_response = Result(SigningResult, SigningErr);
