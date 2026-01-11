import type { ConnectionStatus } from '@novasamatech/host-api';
import { createTransport } from '@novasamatech/host-api';
import { createContainer } from '@novasamatech/host-container';
import { createMetaProvider } from '@novasamatech/product-sdk';

import { describe, expect, it } from 'vitest';

import { createHostApiProviders } from './__mocks__/hostApiProviders.js';

function setup() {
  const providers = createHostApiProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);
  const metaProvider = createMetaProvider(sdkTransport);

  return { container, sdkTransport, metaProvider };
}

describe('Host API: meta provider', () => {
  it('should update connection status in container', async () => {
    const { container } = setup();
    const statuses: ConnectionStatus[] = [];

    container.subscribeConnectionStatus(status => {
      statuses.push(status);
    });

    await container.isReady();

    expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
  });

  it('should update connection status in meta provider', async () => {
    const { sdkTransport, metaProvider } = setup();
    const statuses: ConnectionStatus[] = [];

    metaProvider.subscribeConnectionStatus(status => {
      statuses.push(status);
    });

    await sdkTransport.isReady();

    expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
  });
});
