import type { PappAdapter } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import { AuthProvider } from './AuthProvider.js';
import { UserProvider } from './UserProvider.js';

const Context = createContext<PappAdapter | null>(null);

export const usePapp = () => {
  const provider = useContext(Context);
  if (provider === null) {
    // TODO correct error
    throw new Error('Polkadot app Provider must be defined.');
  }

  return provider;
};

export const PappProvider = ({ adapter, children }: PropsWithChildren<{ adapter: PappAdapter }>) => {
  return (
    <Context.Provider value={adapter}>
      <AuthProvider>
        <UserProvider>{children}</UserProvider>
      </AuthProvider>
    </Context.Provider>
  );
};
