import type { HexString, TxPayloadV1Interface } from '@novasamatech/host-api';
import { createTransport } from '@novasamatech/host-api';
import { createContainer } from '@novasamatech/host-container';
import { createExtensionEnableFactory } from '@novasamatech/product-sdk';

import type { SignerResult } from '@polkadot/types/types';
import { AccountId } from '@polkadot-api/substrate-bindings';
import { assert, describe, expect, it, vitest } from 'vitest';

import { createHostApiProviders } from './__mocks__/hostApiProviders.js';

async function setup() {
  const providers = createHostApiProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);

  const enable = await createExtensionEnableFactory(sdkTransport);
  assert(enable, 'Enable function should be available');

  const injected = await enable();

  return { container, injected };
}

describe('injected web3 provider', () => {
  it('should provide accounts', async () => {
    const accountId = AccountId();
    const mockAccounts = [{ publicKey: new Uint8Array(32), name: 'test' }];

    const { container, injected } = await setup();

    container.handleNonProductAccounts(async () => mockAccounts);

    const injectedAccounts = await injected.accounts.get();

    expect(injectedAccounts).toEqual([
      {
        name: 'test',
        address: accountId.dec(new Uint8Array(32)),
      },
    ]);
  });

  it('should handle signPayload request', async () => {
    const { container, injected } = await setup();

    const payload = '0x0002';
    const signerResult: SignerResult = {
      id: 0,
      signature: '0x0001',
    };

    container.handleSignPayloadRequest(async payload => {
      return { ...signerResult, signedTransaction: payload.method as HexString };
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

    container.handleSignRawRequest(async raw => {
      return { ...signerResult, signedTransaction: raw.data as HexString };
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
    const payload: TxPayloadV1Interface = {
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

    container.handleCreateTransactionWithNonProductAccount(createTransaction);

    const result = await injected.signer.createTransaction?.(payload);

    expect(createTransaction).toBeCalledWith(payload);
    expect(result).toEqual(response);
  });
});
