import { getStatementSigner } from '@polkadot-api/sdk-statement';
import { Binary } from '@polkadot-api/substrate-bindings';
import { nanoid } from 'nanoid';

import type { UserSession } from '../components/user/userSessionStorage.js';

import type { SsSecret } from './crypto.js';
import { getSsPub, signWithSsSecret } from './crypto.js';
import type { Account } from './session/types.js';

export function createUserSession(hostAccount: Account, peerAccount: Account): UserSession {
  return {
    id: nanoid(12),
    peer: peerAccount,
    host: hostAccount,
  };
}

type StatementPayload = {
  priority: number;
  channel: Uint8Array;
  topics: Uint8Array[];
  data: Uint8Array;
};

export function createStatement(secret: SsSecret, payload: StatementPayload) {
  const signer = getStatementSigner(getSsPub(secret), 'sr25519', data => signWithSsSecret(secret, data));

  return signer.sign({
    priority: payload.priority,
    channel: Binary.fromBytes(payload.channel),
    topics: payload.topics.map(Binary.fromBytes),
    data: Binary.fromBytes(payload.data),
  });
}
