import type { HexString } from '@novasamatech/host-api';
import { createTransport } from '@novasamatech/host-api';
import { createContainer } from '@novasamatech/host-container';
import { WellKnownChain, createPapiProvider } from '@novasamatech/product-sdk';

import { describe, expect, it } from 'vitest';

import { createHostApiProviders } from './__mocks__/hostApiProviders.js';

function delay(ttl: number) {
  return new Promise(resolve => setTimeout(resolve, ttl));
}

function setup(chainId: HexString) {
  const providers = createHostApiProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);

  const provider = createPapiProvider(
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

describe('Host API: JSON RPC provider', () => {
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

    container.handleFeature((params, { ok }) =>
      ok(params.tag === 'Chain' && params.value === WellKnownChain.polkadotRelay),
    );
    container.handleJsonRpcMessageSubscribe(WellKnownChain.polkadotRelay, onMessage => {
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

    await delay(50);

    expect(receivedByProvider).toEqual([JSON.stringify(inputMessage)]);
    expect(receivedBySDK).toEqual([JSON.stringify(outputMessage)]);
  });
});
