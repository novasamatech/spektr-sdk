import type { AuthentificationStatus, UserSession } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useDebugValue, useState, useSyncExternalStore } from 'react';

import { usePapp } from '../flow/PappProvider.js';

type State = {
  status: AuthentificationStatus;
  pending: boolean;
  authenticate(): Promise<UserSession | null>;
  abortAuthentication(): void;
  disconnect(session: UserSession): Promise<void>;
};

const Context = createContext<State>({
  status: { step: 'none' },
  pending: false,
  authenticate: () => Promise.resolve(null),
  abortAuthentication() {
    /* empty */
  },
  async disconnect() {
    /* empty */
  },
});

export const useAuthenticateFlow = () => {
  return useContext(Context);
};

const useAuthStatus = () => {
  const provider = usePapp();
  const authStatus = useSyncExternalStore(provider.sso.status.subscribe, provider.sso.status.read);

  useDebugValue(`Polkadot app authentification status: ${authStatus.step}`);

  return authStatus;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [pending, setPending] = useState(false);
  const provider = usePapp();

  const status = useAuthStatus();

  const authenticate = useCallback(() => {
    setPending(true);
    return new Promise<UserSession | null>((resolve, reject) => {
      provider.sso
        .authenticate()
        .andTee(() => setPending(false))
        .orTee(() => setPending(false))
        .match(resolve, reject);
    });
  }, [provider]);

  const disconnect = useCallback(
    (session: UserSession) => {
      return new Promise<void>((resolve, reject) => provider.sessions.disconnect(session).match(resolve, reject));
    },
    [provider],
  );

  const state: State = {
    pending,
    status,
    authenticate,
    abortAuthentication: provider.sso.abortAuthentication,
    disconnect,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};
