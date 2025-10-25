import { createContainer } from '@novasamatech/spektr-dapp-host-container';
import { WellKnownChain, createSpektrPapiProvider } from '@novasamatech/spektr-sdk';
import type { HexString } from '@novasamatech/spektr-sdk-shared';
import { createTransport } from '@novasamatech/spektr-sdk-transport';

import { describe, expect, it } from 'vitest';

import { createProviders } from './__mocks__/providers';

function delay(ttl: number) {
  return new Promise(resolve => setTimeout(resolve, ttl));
}

function setup(chainId: HexString) {
  const providers = createProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);

  const provider = createSpektrPapiProvider(
    {
      chainId,
      fallback: () => {
        return {
          send() {
            /* empty */
          },
          disconnect() {
            /* empty */
          },
        };
      },
    },
    { transport: sdkTransport },
  );

  return { container, provider };
}

describe('PAPI provider', () => {
  it('should send messages', async () => {
    const { container, provider } = setup(WellKnownChain.polkadotRelay);

    const inputMessage = {
      jsonrpc: '2.0',
      id: '1',
      method: 'test_request',
      params: [],
    };

    const outputMessage = {
      jsonrpc: '2.0',
      id: '1',
      method: 'test_response',
      params: ['test'],
    };

    const receivedByProvider: string[] = [];
    const receivedBySDK: string[] = [];

    container.handleChainSupportCheck(async chainId => chainId === WellKnownChain.polkadotRelay);
    container.connectToPapiProvider(WellKnownChain.polkadotRelay, onMessage => {
      return {
        send(message) {
          receivedByProvider.push(message);
          onMessage(JSON.stringify(outputMessage));
        },
        disconnect() {
          /* empty */
        },
      };
    });

    const sdkConnection = provider(message => receivedBySDK.push(message));

    sdkConnection.send(JSON.stringify(inputMessage));

    await delay(100);

    expect(receivedByProvider).toEqual([JSON.stringify(inputMessage)]);
    expect(receivedBySDK).toEqual([JSON.stringify(outputMessage)]);
  });
});
