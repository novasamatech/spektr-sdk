import type { AuthentificationStatus, Identity } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useDebugValue, useState, useSyncExternalStore } from 'react';

import { usePapp } from './PappProvider.js';

type State = {
  status: AuthentificationStatus;
  pending: boolean;
  authenticate(): Promise<Identity | null>;
  abortAuthentication(): void;
  disconnect(accountId: string): Promise<void>;
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
  const authStatus = useSyncExternalStore(provider.user.onAuthStatusChange, provider.user.getAuthStatus);

  useDebugValue(`Polkadot app authentification status: ${authStatus.step}`);

  return authStatus;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [pending, setPending] = useState(false);
  const provider = usePapp();

  const status = useAuthStatus();

  const authenticate = useCallback(() => {
    setPending(true);
    return provider.user.authenticate().finally(() => setPending(false));
  }, [provider]);

  const state: State = {
    pending,
    status,
    authenticate,
    abortAuthentication: provider.user.abortAuthentication,
    disconnect: provider.user.disconnect,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};
