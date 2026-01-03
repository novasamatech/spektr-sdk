import { Bytes, Enum, Option, Result, Struct, Tuple, Vector, _void, str, u32 } from 'scale-ts';

import { GenericErr, GenesisHash, Hex } from '../commonCodecs.js';

// common types

export const AccountId = Bytes(32);
export const PublicKey = Bytes();
export const DotNsIdentifier = str;
export const DerivationIndex = u32;
export const ProductAccountId = Tuple(DotNsIdentifier, DerivationIndex);
export const RingVrfProof = Bytes();
export const RingVrgAlias = Bytes();

// structs

export const Account = Struct({
  publicKey: PublicKey,
  name: Option(str),
});

export const ContextualAlias = Struct({
  context: Bytes(32),
  alias: RingVrgAlias,
});

export const RingLocationHint = Struct({
  palletInstance: Option(u32),
});

export const RingLocation = Struct({
  genesisHash: GenesisHash,
  ringRootHash: Hex(),
  hints: Option(RingLocationHint),
});

// errors

export class RequestCredentialsNotConnectedError extends Error {
  constructor() {
    super('Request credentials error: not connected.');
  }
}

export class RequestCredentialsRejectedError extends Error {
  constructor() {
    super('Request credentials error: rejected.');
  }
}

export class RequestCredentialsDomainNotValidError extends Error {
  constructor() {
    super('Request credentials error: domain not valid.');
  }
}

export class RequestCredentialsUnknownError extends Error {
  constructor(reason: string) {
    super(`Request credentials error: ${reason}`);
  }
}

export const RequestCredentialsErr = Enum({
  NotConnected: _void,
  Rejected: _void,
  DomainNotValid: _void,
  Unknown: GenericErr,
});

export class CreateProofRingNotFoundError extends Error {
  constructor() {
    super('Create proof error: ring not found.');
  }
}

export class CreateProofRejectedError extends Error {
  constructor() {
    super('Create proof error: rejected.');
  }
}

export class CreateProofUnknownError extends Error {
  constructor(reason: string) {
    super(`Create proof error: ${reason}`);
  }
}

export const CreateProofErr = Enum({
  RingNotFound: _void,
  Rejected: _void,
  Unknown: GenericErr,
});

// account_get

export const AccountGetV1_request = ProductAccountId;
export const AccountGetV1_response = Result(Account, RequestCredentialsErr);

// account_get_alias

export const AccountGetAliasV1_request = ProductAccountId;
export const AccountGetAliasV1_response = Result(ContextualAlias, RequestCredentialsErr);

// account_create_proof

export const AccountCreateProofV1_request = Tuple(ProductAccountId, RingLocation, Bytes());
export const AccountCreateProofV1_response = Result(RingVrfProof, CreateProofErr);

// get_non_product_accounts

export const GetNonProductAccountsV1_request = _void;
export const GetNonProductAccountsV1_response = Result(Vector(Account), RequestCredentialsErr);
