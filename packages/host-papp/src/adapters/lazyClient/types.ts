import type { PolkadotClient } from 'polkadot-api';

export type LazyClientAdapter = {
  getClient(): PolkadotClient;
  disconnect(): void;
};
