import type { HexString, Transport } from '@novasamatech/host-api';
import { unwrapResultOrThrow } from '@novasamatech/host-api';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { getSyncProvider } from '@polkadot-api/json-rpc-provider-proxy';

import { defaultTransport } from './defaultTransport.js';

type Params = {
  chainId: HexString;
  fallback: JsonRpcProvider;
};

type InternalParams = {
  transport?: Transport;
};

export function createSpektrPapiProvider(
  { chainId: genesisHash, fallback }: Params,
  internal?: InternalParams,
): JsonRpcProvider {
  const transport = internal?.transport ?? defaultTransport;
  if (!transport.isCorrectEnvironment()) return fallback;

  const spektrProvider: JsonRpcProvider = onMessage => {
    const unsubscribe = transport.subscribe('papiProviderReceiveMessageV1', (_, payload) => {
      const unwrapped = unwrapResultOrThrow(payload, e => new Error(e));
      if (unwrapped.genesisHash === genesisHash) {
        onMessage(unwrapped.message);
      }
    });

    return {
      send(message) {
        transport.postMessage('_', { tag: 'papiProviderSendMessageV1', value: { genesisHash, message } });
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
          { tag: 'supportFeatureRequestV1', value: { tag: 'chain', value: { genesisHash } } },
          'supportFeatureResponseV1',
        )
        .then(payload => {
          const result = unwrapResultOrThrow(payload, e => new Error(e));

          if (result.tag === 'chain' && result.value.genesisHash === genesisHash) {
            return result.value.result;
          }
        })
        .catch(e => {
          transport.provider.logger.error('Error checking chain support', e);
          return false;
        });
    });
  }

  return getSyncProvider(() => checkIfReady().then(ready => (ready ? spektrProvider : fallback)));
}
