import type { Identity, SignInStatus } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { usePapp } from './PappProvider.js';

type State = {
  identity: Identity | null;
  signInStatus: SignInStatus;
  pending: boolean;
  initiatedByUser: boolean;
  signIn(): Promise<Identity | null>;
  abort(): void;
};

const Context = createContext<State>({
  identity: null,
  signInStatus: { step: 'none' },
  pending: false,
  initiatedByUser: false,
  signIn: () => Promise.resolve(null),
  abort() {
    /* empty */
  },
});

export const useSignInFlow = () => {
  return useContext(Context);
};

export const SignInStateProvider = ({ children }: PropsWithChildren) => {
  const [pending, setPending] = useState(false);
  const [initiatedByUser, setInitiatedByUser] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const provider = usePapp();

  const signInStatus = useSyncExternalStore(provider.users.onSignInStatusChange, provider.users.getSignInStatus);

  useDebugValue(`Polkadot app sign in status: ${signInStatus.step}`);

  useEffect(() => {
    let mounted = true;

    setPending(true);

    provider.users.getSelectedUser().then(identity => {
      if (!mounted) return;
      setIdentity(identity);
      setPending(false);
    });

    return () => {
      mounted = false;
    };
  }, [provider]);

  const signIn = useCallback(() => {
    setPending(true);
    setInitiatedByUser(true);
    return provider.users
      .signIn()
      .then(identity => {
        setIdentity(identity);
        return identity;
      })
      .finally(() => setPending(false));
  }, [provider]);

  const state: State = {
    pending,
    signInStatus,
    initiatedByUser,
    identity,
    signIn,
    abort: provider.users.abortSignIn,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};
