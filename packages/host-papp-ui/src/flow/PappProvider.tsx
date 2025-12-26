import type { PappAdapter } from '@novasamatech/host-papp';
import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import { AuthProvider } from '../providers/AuthProvider.js';
import { SessionsProvider } from '../providers/SessionsProvider.js';
import type { TranslationsMap } from '../providers/TranslationProvider.js';
import { TranslationProvider } from '../providers/TranslationProvider.js';

const Context = createContext<PappAdapter | null>(null);

export const usePapp = () => {
  const provider = useContext(Context);
  if (provider === null) {
    // TODO correct error
    throw new Error('Polkadot app Provider must be defined.');
  }

  return provider;
};

type Props = PropsWithChildren<{
  adapter: PappAdapter;
  language?: string;
  translations?: TranslationsMap;
}>;

export const PappProvider = ({ adapter, language, translations, children }: Props) => {
  return (
    <Context.Provider value={adapter}>
      <TranslationProvider language={language} keys={translations}>
        <AuthProvider>
          <SessionsProvider>{children}</SessionsProvider>
        </AuthProvider>
      </TranslationProvider>
    </Context.Provider>
  );
};
