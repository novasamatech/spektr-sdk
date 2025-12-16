import { mergeUint8 } from '@polkadot-api/utils';

import { khash, stringToBytes } from '../crypto.js';

import type { Account } from './types.js';

export function createSessionId(accountA: Account, accountB: Account) {
  const sessionPrefix = stringToBytes('session');
  const pinSeparator = stringToBytes('/');

  function makePin(pin?: string) {
    return pin ? mergeUint8([pinSeparator, stringToBytes(pin)]) : pinSeparator;
  }

  const accountSessionParams = mergeUint8([
    accountA.accountId,
    accountB.accountId,
    makePin(accountA.pin),
    makePin(accountB.pin),
  ]);

  return khash(accountA.publicKey, mergeUint8(sessionPrefix, accountSessionParams));
}

export function createRequestChannel(session: Uint8Array) {
  return khash(session, stringToBytes('request'));
}

export function createResponseChannel(session: Uint8Array) {
  return khash(session, stringToBytes('response'));
}

export function createAccount(accountId: Uint8Array, publicKey: Uint8Array, pin?: string): Account {
  return {
    accountId,
    publicKey,
    pin,
  };
}
