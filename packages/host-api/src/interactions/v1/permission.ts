import { Enum, Result, Struct, Vector, _void, str } from 'scale-ts';

import { GenericErr, Hex } from '../commonCodecs.js';

export const PermissionErr = Enum({
  Rejected: _void,
  Unknown: GenericErr,
});

export const ChainConnectPermission = Struct({
  genesisHash: Hex(),
  name: str,
});

export const Permission = Enum({
  ChainSubmit: Hex(),
  ChainConnect: ChainConnectPermission,
  NetworkRequest: Vector(str),
  // TBD
});

export const PermissionRequestV1_request = Permission;
export const PermissionRequestV1_response = Result(_void, PermissionErr);
