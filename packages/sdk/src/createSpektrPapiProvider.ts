import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { getSyncProvider } from '@polkadot-api/json-rpc-provider-proxy';
import { type HexString } from '@novasamatech/spektr-sdk-shared';
import { type Transport, unwrapResponseOrThrow } from '@novasamatech/spektr-sdk-transport';
import { defaultTransport } from './transport';

type Params = {
  chainId: HexString;
  fallback: JsonRpcProvider;
};

type InternalParams = {
  transport: Transport | null;
};

export function createSpektrPapiProvider({ chainId, fallback }: Params, internal?: InternalParams): JsonRpcProvider {
  const transport = internal?.transport ?? defaultTransport;
  if (!transport) return fallback;

  const isReady = transport.isReady;
  const request = transport.request;
  const subscribe = transport.subscribe;
  const postMessage = transport.postMessage;

  const spektrProvider: JsonRpcProvider = onMessage => {
    const unsubscribe = subscribe('papiProviderReceiveMessageV1', (_, message) => {
      const unwrapped = unwrapResponseOrThrow(message.value);
      if (unwrapped.chainId === chainId) {
        onMessage(unwrapped.message);
      }
    });

    return {
      send(message) {
        postMessage('_', { tag: 'papiProviderSendMessageV1', value: { chainId, message } });
      },
      disconnect() {
        unsubscribe();
      },
    };
  };

  function checkIfReady() {
    return isReady().then(ready => {
      if (!ready) return false;

      return request({ tag: 'supportFeatureRequestV1', value: { tag: 'chain', value: { chainId } } })
        .then(response => {
          if (response.tag === 'supportFeatureResponseV1') {
            const result = unwrapResponseOrThrow(response.value);

            if (result.tag === 'chain' && result.value.chainId === chainId) {
              return result.value.result;
            }
          }
          throw new Error(`Invalid response, got ${response.tag} message`);
        })
        .catch(e => {
          console.error('Error checking chain support', e);
          return false;
        });
    });
  }

  return getSyncProvider(() => checkIfReady().then(ready => (ready ? spektrProvider : fallback)));
}
