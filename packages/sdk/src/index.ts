import type { Injected } from '@polkadot/extension-inject/types';
import { injectExtension } from '@polkadot/extension-inject';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { type HexString } from '@spektr/sdk-shared';
import { unwrapResponseOrThrow } from '@spektr/sdk-transport';
import { ProviderName, Version } from './constants';
import { createTransport, defaultProvider, type Provider } from './createTransport';
import type { InjectedWindowProvider } from './types';

export function init(provider: Provider = defaultProvider) {
  const transport = createTransport(provider);
  if (!transport) return null;

  const api = {
    inject(): InjectedWindowProvider {
      const request = transport.request;
      const subscribe = transport.subscribe;

      async function enable(): Promise<Injected> {
        return {
          accounts: {
            get() {
              return request({ tag: 'getAccountsRequestV1', value: undefined }).then(e => {
                if (e.tag === 'getAccountsResponseV1') {
                  return unwrapResponseOrThrow(e.value);
                }
                throw new Error(`Invalid response, got ${e.tag} message`);
              });
            },
            subscribe(callback) {
              return subscribe('getAccountsResponseV1', (_, message) => {
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
              return request({ tag: 'signRawRequestV1', value: raw }).then(response => {
                if (response.tag === 'signPayloadResponseV1') {
                  return unwrapResponseOrThrow(response.value);
                }
                throw new Error(`Invalid response, got ${response.tag} message`);
              });
            },
            signPayload(payload) {
              return request({ tag: 'signPayloadRequestV1', value: payload }).then(response => {
                if (response.tag === 'signPayloadResponseV1') {
                  return unwrapResponseOrThrow(response.value);
                }
                throw new Error(`Invalid response, got ${response.tag} message`);
              });
            },
          },
        };
      }

      injectExtension(enable, { name: ProviderName, version: Version });

      return {
        enable,
        version: Version,
      };
    },

    createPapiProvider(chainId: HexString): JsonRpcProvider {
      return onMessage => {
        const unsubscribe = transport.subscribe('papiProviderReceiveMessageV1', (_, message) => {
          const unwrapped = unwrapResponseOrThrow(message.value);
          if (unwrapped.chainId === chainId) {
            onMessage(unwrapped.message);
          }
        });

        return {
          send(message) {
            transport.send('_', { tag: 'papiProviderSendMessageV1', value: { chainId, message } });
          },
          disconnect() {
            unsubscribe();
          },
        };
      };
    },
  };

  return api;
}
