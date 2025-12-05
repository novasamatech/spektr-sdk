import type { Identity, SignInStatus } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';

import { usePapp } from './PappProvider.js';

type State = {
  identity: Identity | null;
  signInStatus: SignInStatus;
  pending: boolean;
  signIn(): Promise<Identity | null>;
  abort(): void;
};

const Context = createContext<State>({
  identity: null,
  signInStatus: { step: 'none' },
  pending: false,
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
  const [identity, setIdentity] = useState<Identity | null>(null);
  const provider = usePapp();

  const signInStatus = useSyncExternalStore(provider.auth.onSignInStatusChange, provider.auth.getSignInStatus);

  useEffect(() => {
    let mounted = true;

    setPending(true);

    provider.auth.getCurrentUser().then(identity => {
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
    return provider.auth
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
    identity,
    signIn,
    abort: provider.auth.abortSignIn,
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
};
