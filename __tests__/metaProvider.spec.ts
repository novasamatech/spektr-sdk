import { createContainer } from '@novasamatech/spektr-dapp-host-container';
import { createSpektrMetaProvider } from '@novasamatech/spektr-sdk';
import type { ConnectionStatus } from '@novasamatech/spektr-sdk-transport';
import { createTransport } from '@novasamatech/spektr-sdk-transport';

import { describe, expect, it } from 'vitest';

import { createProviders } from './__mocks__/providers';

function setup() {
  const providers = createProviders();
  const container = createContainer(providers.host);
  const sdkTransport = createTransport(providers.sdk);
  const metaProvider = createSpektrMetaProvider(sdkTransport);

  return { container, sdkTransport, metaProvider };
}

describe('meta provider', () => {
  it('should update connection status in container', async () => {
    const { container } = setup();
    const statuses: ConnectionStatus[] = [];

    container.subscribeConnectionStatus(status => {
      statuses.push(status);
    });

    await container.isReady();

    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('should update connection status in meta provider', async () => {
    const { sdkTransport, metaProvider } = setup();
    const statuses: ConnectionStatus[] = [];

    metaProvider.subscribeConnectionStatus(status => {
      statuses.push(status);
    });

    await sdkTransport.isReady();

    expect(statuses).toEqual(['connecting', 'connected']);
  });
});
