import type { Transport } from '@novasamatech/spektr-sdk-transport';
import { unwrapResponseOrThrow } from '@novasamatech/spektr-sdk-transport';
import { injectExtension } from '@polkadot/extension-inject';
import type { Injected } from '@polkadot/extension-inject/types';

import { SpektrExtensionName, Version } from './constants';
import { defaultTransport } from './transport';

export async function createExtensionEnableFactory(transport: Transport) {
  const ready = await transport.isReady();
  if (!ready) return null;

  async function enable(): Promise<Injected> {
    return {
      accounts: {
        get() {
          return transport
            .request({ tag: 'getAccountsRequestV1', value: undefined }, 'getAccountsResponseV1')
            .then(unwrapResponseOrThrow);
        },
        subscribe(callback) {
          const unsubscribe = transport.subscribe('getAccountsResponseV1', (_, payload) => {
            try {
              const accounts = unwrapResponseOrThrow(payload);
              callback(accounts);
            } catch {
              console.error('Failed response on account subscription', payload.value);
            }
          });

          transport.postMessage('_', { tag: 'accountSubscriptionV1', value: undefined });

          return () => {
            transport.postMessage('_', { tag: 'accountUnsubscriptionV1', value: undefined });
            unsubscribe();
          };
        },
      },

      signer: {
        signRaw(raw) {
          return transport
            .request({ tag: 'signRawRequestV1', value: raw }, 'signResponseV1')
            .then(unwrapResponseOrThrow);
        },
        signPayload(payload) {
          return transport
            .request({ tag: 'signPayloadRequestV1', value: payload }, 'signResponseV1')
            .then(unwrapResponseOrThrow);
        },
      },
    };
  }

  return enable;
}

export async function injectSpektrExtension(transport: Transport | null = defaultTransport) {
  if (!transport) return false;

  try {
    const enable = await createExtensionEnableFactory(transport);

    if (enable) {
      injectExtension(enable, { name: SpektrExtensionName, version: Version });
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error('Error injecting extension', e);
    return false;
  }
}
