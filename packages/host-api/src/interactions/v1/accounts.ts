import { Bytes, Tuple, str, u32 } from 'scale-ts';

export const AccountId = Bytes(32);
export const PublicKey = Bytes();
export const DotNsIdentifier = str;
export const DerivationIndex = u32;
export const ProductAccountId = Tuple(DotNsIdentifier, DerivationIndex);

// TODO implement
