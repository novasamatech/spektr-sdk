import type { UserSession } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useDebugValue, useEffect, useState } from 'react';

import { usePapp } from '../flow/PappProvider.js';

type State = {
  session: UserSession | null;
};

const Context = createContext<State | null>(null);

export const useSession = () => {
  const session = useContext(Context);
  if (session === null) {
    throw new Error('User provider is not defined');
  }

  return session;
};

export const SessionsProvider = ({ children }: PropsWithChildren) => {
  const session = useUserSession();

  const state: State = {
    session,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};

const useUserSessions = () => {
  const provider = usePapp();
  const [sessions, setSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    return provider.sessions.sessions.subscribe(setSessions);
  }, [provider]);

  useDebugValue(`Sessions: ${sessions.length}`);

  return sessions;
};

export const useUserSession = () => {
  const sessions = useUserSessions();
  const selectedUser = sessions.at(0) ?? null;

  useDebugValue(`Selected user: ${selectedUser?.remoteAccount.accountId.toString() ?? 'None'}`);

  return selectedUser;
};
