import { Result, Struct, Vector, _void, str } from 'scale-ts';

import { Enum, ErrEnum, GenericErr, GenesisHash } from '../commonCodecs.js';

export const PermissionErr = ErrEnum('PermissionErr', {
  Rejected: [_void, 'Permission: rejected'],
  Unknown: [GenericErr, 'Permission: unknown error'],
});

export const ChainConnectPermission = Struct({
  genesisHash: GenesisHash,
  name: str,
});

export const Permission = Enum({
  ChainSubmit: GenesisHash,
  ChainConnect: ChainConnectPermission,
  NetworkRequest: Vector(str),
  // TBD
});

export const PermissionRequestV1_request = Permission;
export const PermissionRequestV1_response = Result(_void, PermissionErr);
