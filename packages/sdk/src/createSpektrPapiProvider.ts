import type { HexString } from '@novasamatech/spektr-sdk-shared';
import type { Transport } from '@novasamatech/spektr-sdk-transport';
import { unwrapResponseOrThrow } from '@novasamatech/spektr-sdk-transport';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { getSyncProvider } from '@polkadot-api/json-rpc-provider-proxy';

import { defaultTransport } from './transport';

type Params = {
  chainId: HexString;
  fallback: JsonRpcProvider;
};

type InternalParams = {
  transport?: Transport;
};

export function createSpektrPapiProvider({ chainId, fallback }: Params, internal?: InternalParams): JsonRpcProvider {
  const transport = internal?.transport ?? defaultTransport;
  if (!transport.isCorrectEnvironment()) return fallback;

  const spektrProvider: JsonRpcProvider = onMessage => {
    const unsubscribe = transport.subscribe('papiProviderReceiveMessageV1', (_, payload) => {
      const unwrapped = unwrapResponseOrThrow(payload);
      if (unwrapped.chainId === chainId) {
        onMessage(unwrapped.message);
      }
    });

    return {
      send(message) {
        transport.postMessage('_', { tag: 'papiProviderSendMessageV1', value: { chainId, message } });
      },
      disconnect() {
        unsubscribe();
      },
    };
  };

  function checkIfReady() {
    return transport.isReady().then(ready => {
      if (!ready) return false;

      return transport
        .request(
          { tag: 'supportFeatureRequestV1', value: { tag: 'chain', value: { chainId } } },
          'supportFeatureResponseV1',
        )
        .then(payload => {
          const result = unwrapResponseOrThrow(payload);

          if (result.tag === 'chain' && result.value.chainId === chainId) {
            return result.value.result;
          }
        })
        .catch(e => {
          console.error('Error checking chain support', e);
          return false;
        });
    });
  }

  return getSyncProvider(() => checkIfReady().then(ready => (ready ? spektrProvider : fallback)));
}
