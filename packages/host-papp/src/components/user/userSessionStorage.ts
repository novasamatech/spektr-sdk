import { fromHex, toHex } from 'polkadot-api/utils';
import { Bytes, Option, Struct, Vector, str } from 'scale-ts';

import type { StorageAdapter } from '../../adapters/storage/types.js';
import type { Account } from '../../modules/session/types.js';
import { storageListView } from '../../modules/storageView.js';

export type UserSessionStorage = ReturnType<typeof createUserSessionStorage>;

export type UserSession = {
  id: string;
  host: Account;
  peer: Account;
};

const accountCodec = Struct({
  accountId: Bytes(),
  publicKey: Bytes(),
  pin: Option(str),
});

const userSessionCodec = Struct({
  id: str,
  host: accountCodec,
  peer: accountCodec,
});

const userSessionsCodec = Vector(userSessionCodec);

type Params = {
  storage: StorageAdapter;
};

export const createUserSessionStorage = ({ storage }: Params) => {
  return storageListView<UserSession>({
    storage,
    key: 'Sessions',
    autosync: true,
    initial: [],
    from: x => userSessionsCodec.dec(fromHex(x)),
    to: x => toHex(userSessionsCodec.enc(x)),
  });
};
