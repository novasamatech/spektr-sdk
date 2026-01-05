import { Bytes, Option, Result, Tuple, _void } from 'scale-ts';

import { ErrEnum, GenericErr, Hex } from '../commonCodecs.js';

// common structures

export const StorageErr = ErrEnum({
  Full: [_void, 'Storage: full'],
  Unknown: [GenericErr, 'Storage: unknown error'],
});

export const StorageKey = Hex();
export const StorageValue = Bytes();

// actions

export const StorageReadV1_request = StorageKey;
export const StorageReadV1_response = Result(Option(StorageValue), StorageErr);

export const StorageWriteV1_request = Tuple(StorageKey, StorageValue);
export const StorageWriteV1_response = Result(_void, StorageErr);

export const StorageClearV1_request = StorageKey;
export const StorageClearV1_response = Result(_void, StorageErr);
