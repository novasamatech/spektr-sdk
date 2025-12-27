import { Bytes, Enum, Option, Result, Tuple, _void } from 'scale-ts';

import { GenericErr, Hex } from '../commonCodecs.js';

// common structures

export const StorageErr = Enum({
  Full: _void,
  Unknown: GenericErr,
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
