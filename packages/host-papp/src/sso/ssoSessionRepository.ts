import type { LocalSessionAccount, RemoteSessionAccount } from '@novasamatech/statement-store';
import { LocalSessionAccountCodec, RemoteSessionAccountCodec } from '@novasamatech/statement-store';
import type { StorageAdapter } from '@novasamatech/storage-adapter';
import { fieldListView } from '@novasamatech/storage-adapter';
import { fromHex, toHex } from '@polkadot-api/utils';
import { nanoid } from 'nanoid';
import { Struct, Vector, str } from 'scale-ts';

export type SsoSessionRepository = ReturnType<typeof createSsoSessionRepository>;

export type UserSession = {
  id: string;
  local: LocalSessionAccount;
  remote: RemoteSessionAccount;
};

const userSessionCodec = Struct({
  id: str,
  local: LocalSessionAccountCodec,
  remote: RemoteSessionAccountCodec,
});

export function createUserSession(localAccount: LocalSessionAccount, remoteAccount: RemoteSessionAccount): UserSession {
  return {
    id: nanoid(12),
    local: localAccount,
    remote: remoteAccount,
  };
}

const userSessionsCodec = Vector(userSessionCodec);

export const createSsoSessionRepository = (storage: StorageAdapter) => {
  return fieldListView<UserSession>({
    storage,
    key: 'SsoSessions',
    initial: [],
    from: x => userSessionsCodec.dec(fromHex(x)),
    to: x => toHex(userSessionsCodec.enc(x)),
  });
};
