import type { HexString, InjectedAccountSchema, TxPayloadV1 } from '@novasamatech/host-api';
import { createTransport } from '@novasamatech/host-api';
import { createContainer } from '@novasamatech/host-container';
import { createExtensionEnableFactory } from '@novasamatech/product-sdk';

import type { SignerResult } from '@polkadot/types/types';
import { default as mitt } from 'mitt';
import { assert, describe, expect, it, vitest } from 'vitest';

import { createHostApiProviders } from './__mocks__/hostApiProviders';

async function setup() {
  const providers = createHostApiProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);

  const enable = await createExtensionEnableFactory(sdkTransport);
  assert(enable, 'Enable function should be available');

  const injected = await enable();

  return { container, injected };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function notImplemented(_: unknown): Promise<never> {
  throw new Error('Not implemented');
}

describe('injected web3 provider', () => {
  it('should provide accounts', async () => {
    const mockAccounts: InjectedAccountSchema[] = [{ name: 'test', address: '0x00', type: 'sr25519' }];

    const { container, injected } = await setup();

    container.handleAccounts({
      async get() {
        return mockAccounts;
      },
      subscribe() {
        return () => {
          /* empty */
        };
      },
    });

    const injectedAccounts = await injected.accounts.get();

    expect(injectedAccounts).toEqual(mockAccounts);
  });

  it('should subscribe accounts', async () => {
    const mockAccounts: InjectedAccountSchema[] = [{ name: 'test', address: '0x00', type: 'sr25519' }];
    const accountsBus = mitt<{ accounts: InjectedAccountSchema[] }>();

    const { container, injected } = await setup();

    container.handleAccounts({
      async get() {
        return [];
      },
      subscribe(callback) {
        accountsBus.on('accounts', callback);
        return () => {
          accountsBus.off('accounts', callback);
        };
      },
    });

    let result: InjectedAccountSchema[] = [];

    const unsubscribe = injected.accounts.subscribe(accounts => {
      // TODO type miss match - type field also includes "ethereum" that is not defined in polkadot-api library.
      result = accounts as InjectedAccountSchema[];
    });

    accountsBus.emit('accounts', mockAccounts);
    unsubscribe();
    accountsBus.emit('accounts', []);

    expect(result).toEqual(mockAccounts);
  });

  it('should handle signPayload request', async () => {
    const { container, injected } = await setup();

    const payload = '0x0002';
    const signerResult: SignerResult = {
      id: 0,
      signature: '0x0001',
    };

    container.handleSignRequest({
      async signPayload(payload) {
        return { ...signerResult, signedTransaction: payload.method as HexString };
      },
      signRaw: notImplemented,
      createTransaction: notImplemented,
    });

    const result = await injected.signer.signPayload?.({
      address: '0x00',
      genesisHash: '0x00',
      nonce: '0x00',
      method: payload,
      blockHash: '0x00',
      blockNumber: '0x00',
      era: '0x00',
      version: 4,
      specVersion: '0x00',
      tip: '0x00',
      signedExtensions: [],
      transactionVersion: '0x00',
    });

    expect(result).toEqual({ ...signerResult, signedTransaction: payload });
  });

  it('should handle signRaw request', async () => {
    const { container, injected } = await setup();

    const payload = '0x0002';
    const signerResult: SignerResult = {
      id: 0,
      signature: '0x0001',
    };

    container.handleSignRequest({
      async signRaw(raw) {
        return { ...signerResult, signedTransaction: raw.data as HexString };
      },
      signPayload: notImplemented,
      createTransaction: notImplemented,
    });

    const result = await injected.signer.signRaw?.({
      address: '0x00',
      type: 'payload',
      data: payload,
    });

    expect(result).toEqual({ ...signerResult, signedTransaction: payload });
  });

  it('should handle createTransaction request', async () => {
    const { container, injected } = await setup();

    const response: HexString = '0x0001';
    const payload: TxPayloadV1 = {
      version: 1,
      signer: 'test',
      callData: '0x0002',
      extensions: [
        {
          id: 'test',
          additionalSigned: '0x0000',
          extra: '0x0000',
        },
      ],
      txExtVersion: 15,
      context: {
        metadata: '0x0000',
        bestBlockHeight: 1,
        tokenSymbol: 'DOT',
        tokenDecimals: 10,
      },
    };

    const createTransaction = vitest.fn(async () => response);

    container.handleSignRequest({
      createTransaction,
      signPayload: notImplemented,
      signRaw: notImplemented,
    });

    const result = await injected.signer.createTransaction?.(payload);

    expect(createTransaction).toBeCalledWith(payload);
    expect(result).toEqual(response);
  });
});
