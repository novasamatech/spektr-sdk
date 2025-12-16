import type { SessionParams } from '../../modules/session/session.js';
import { createSession } from '../../modules/session/session.js';
import type { Session } from '../../modules/session/types.js';

import { HostRemoteMessageCodec } from './codec.js';

export type SsoSession = Session<typeof HostRemoteMessageCodec>;

export function createSSOSession({
  ownAccount,
  peerAccount,
  transport,
  storage,
}: Omit<SessionParams<any>, 'codec'>): SsoSession {
  return createSession({ ownAccount, peerAccount, transport, storage, codec: HostRemoteMessageCodec });
}
