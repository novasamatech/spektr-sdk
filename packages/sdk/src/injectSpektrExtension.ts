import type { Injected } from '@polkadot/extension-inject/types';
import { injectExtension } from '@polkadot/extension-inject';
import { type Transport, unwrapResponseOrThrow } from '@novasamatech/spektr-sdk-transport';
import { SpektrExtensionName, Version } from './constants';
import { defaultTransport } from './transport';

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
            if (response.tag === 'signResponseV1') {
              return unwrapResponseOrThrow(response.value);
            }
            throw new Error(`Invalid response, got ${response.tag} message`);
          });
        },
        signPayload(payload) {
          return transport.request({ tag: 'signPayloadRequestV1', value: payload }).then(response => {
            if (response.tag === 'signResponseV1') {
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

export async function injectSpektrExtension(transport: Transport | null = defaultTransport) {
  if (!transport) return false;

  const ready = await transport.isReady();
  if (!ready) return false;

  injectPolkadotExtension(transport);

  return true;
}
