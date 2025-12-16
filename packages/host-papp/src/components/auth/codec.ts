import { Bytes, Enum, Tuple, str } from 'scale-ts';

import { EncrPubKey, SsPubKey } from '../../modules/crypto.js';

export const HandshakeData = Enum({
  V1: Tuple(SsPubKey, EncrPubKey, str),
});

export const HandshakeResponsePayload = Enum({
  // [encrypted, tmp_key]
  V1: Tuple(Bytes(), Bytes(65)),
});

export const HandshakeResponseSensitiveData = Tuple(Bytes(65), Bytes(32));
