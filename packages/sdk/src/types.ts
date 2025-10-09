import type { Injected } from '@polkadot/extension-inject/types';

export interface InjectedWindowProvider {
  enable: () => Promise<Injected>;
  version: string;
}

export interface InjectedWindow {
  injectedWeb3: Record<string, InjectedWindowProvider>;
}
