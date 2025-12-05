import type { UnsignedStatement } from '@polkadot-api/sdk-statement';
import { getStatementSigner } from '@polkadot-api/sdk-statement';
import * as sr25519 from '@scure/sr25519';

import type { SsSecret } from './crypto.js';
import { getSsPub, khash, mergeBytes, stringToBytes } from './crypto.js';

export function createSession({
  sharedSecret,
  accountA,
  accountB,
  pinA,
  pinB,
}: {
  sharedSecret: Uint8Array;
  accountA: Uint8Array;
  accountB: Uint8Array;
  pinA?: string;
  pinB?: string;
}) {
  const sessionPrefix = stringToBytes('session');
  const pinSeparator = stringToBytes('/');

  function makePin(pin?: string) {
    return pin ? mergeBytes(pinSeparator, stringToBytes(pin)) : pinSeparator;
  }

  const accountASessionParams = mergeBytes(sessionPrefix, accountA, accountB, makePin(pinA), makePin(pinB));
  const accountBSessionParams = mergeBytes(sessionPrefix, accountB, accountA, makePin(pinB), makePin(pinA));

  return {
    a: khash(sharedSecret, accountASessionParams),
    b: khash(sharedSecret, accountBSessionParams),
  };
}

export function createStatement(secret: SsSecret, payload: UnsignedStatement) {
  const signer = getStatementSigner(getSsPub(secret), 'sr25519', data => sr25519.sign(secret, data));

  return signer.sign(payload);
}
