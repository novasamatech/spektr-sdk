import { Enum, Result, _void, u8 } from 'scale-ts';

import { GenericErr } from '../commonCodecs.js';

export class HandshakeTimeoutError extends Error {
  constructor() {
    super('Handshake error: timeout.');
  }
}

export class HandshakeUnsupportedProtocolVersionError extends Error {
  constructor() {
    super('Handshake error: unsupported protocol version.');
  }
}

export class HandshakeUnknownError extends Error {
  constructor(reason: string) {
    super(`Handshake error: ${reason}`);
  }
}

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
