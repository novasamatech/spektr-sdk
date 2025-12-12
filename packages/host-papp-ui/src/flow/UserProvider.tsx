import type { Identity } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useDebugValue, useEffect, useState } from 'react';

import { usePapp } from './PappProvider.js';

type State = {
  pending: boolean;
  selectedUser: Identity | null;
  users: Identity[];
  selectUser(accountId: string): void;
};

const Context = createContext<State | null>(null);

export const useUser = () => {
  const user = useContext(Context);
  if (user === null) {
    throw new Error('User provider is not defined');
  }

  return user;
};

export const UserProvider = ({ children }: PropsWithChildren) => {
  const [pending, setPending] = useState(false);
  const selectedUser = useSelectedUser();
  const users = useUsers();
  const provider = usePapp();

  const selectUser = useCallback(
    (accountId: string) => {
      setPending(true);
      return provider.user.selectUser(accountId).finally(() => setPending(false));
    },
    [provider],
  );

  const state: State = {
    pending,
    selectedUser,
    users,
    selectUser,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};

const useSelectedUser = () => {
  const provider = usePapp();
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null);

  useEffect(() => {
    return provider.user.onSelectedUserChange(setSelectedUser);
  }, [provider]);

  useDebugValue(`Selected user: ${selectedUser?.liteUsername ?? 'None'}`);

  return selectedUser;
};

const useUsers = () => {
  const provider = usePapp();
  const [users, setUsers] = useState<Identity[]>([]);

  useEffect(() => {
    provider.user.onUsersChange(setUsers);
  }, [provider]);

  useDebugValue(`Users: ${users.length}`);

  return users;
};
