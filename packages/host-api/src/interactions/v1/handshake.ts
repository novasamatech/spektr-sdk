import { Enum, Result, _void, u8 } from 'scale-ts';

import { GenericErr } from '../commonCodecs.js';

export const HandshakeErr = Enum({
  Timeout: _void,
  UnsupportedProtocolVersion: _void,
  Unknown: GenericErr,
});

/**
 * HandshakeV1_request = 1 - JAM codec
 */
export const HandshakeV1_request = u8;
export const HandshakeV1_response = Result(_void, HandshakeErr);
