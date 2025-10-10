import type { Injected } from '@polkadot/extension-inject/types';
import { injectExtension } from '@polkadot/extension-inject';
import { unwrapResponseOrThrow } from '@spektr/sdk-transport';
import { SpektrExtensionName, Version } from './constants';
import { type Transport, createTransport, defaultProvider, type Provider } from './createTransport';

function injectPolkadotExtension(transport: Transport) {
  async function enable(): Promise<Injected> {
    return {
      accounts: {
        get() {
          return transport.request({ tag: 'getAccountsRequestV1', value: undefined }).then(e => {
            if (e.tag === 'getAccountsResponseV1') {
              return unwrapResponseOrThrow(e.value);
            }
            throw new Error(`Invalid response, got ${e.tag} message`);
          });
        },
        subscribe(callback) {
          return transport.subscribe('getAccountsResponseV1', (_, message) => {
            try {
              const accounts = unwrapResponseOrThrow(message.value);
              callback(accounts);
            } catch {
              console.error('Invalid account response, got', message.value.value);
            }
          });
        },
      },

      signer: {
        signRaw(raw) {
          return transport.request({ tag: 'signRawRequestV1', value: raw }).then(response => {
            if (response.tag === 'signPayloadResponseV1') {
              return unwrapResponseOrThrow(response.value);
            }
            throw new Error(`Invalid response, got ${response.tag} message`);
          });
        },
        signPayload(payload) {
          return transport.request({ tag: 'signPayloadRequestV1', value: payload }).then(response => {
            if (response.tag === 'signPayloadResponseV1') {
              return unwrapResponseOrThrow(response.value);
            }
            throw new Error(`Invalid response, got ${response.tag} message`);
          });
        },
      },
    };
  }

  injectExtension(enable, { name: SpektrExtensionName, version: Version });
}

export async function injectSpektrExtension(provider: Provider = defaultProvider) {
  const transport = createTransport(provider);
  if (!transport) return false;

  const ready = await transport.isSpektrReady();
  if (!ready) return false;

  injectPolkadotExtension(transport);

  return true;
}
