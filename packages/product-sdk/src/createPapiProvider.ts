import type { HexString, Transport } from '@novasamatech/host-api';
import { createHostApi, enumValue, unwrapResultOrThrow } from '@novasamatech/host-api';
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

export function createPapiProvider(
  { chainId: genesisHash, fallback }: Params,
  internal?: InternalParams,
): JsonRpcProvider {
  const transport = internal?.transport ?? defaultTransport;
  if (!transport.isCorrectEnvironment()) return fallback;

  const hostApi = createHostApi(transport);

  const spektrProvider: JsonRpcProvider = onMessage => {
    const unsubscribe = hostApi.jsonrpc_message_subscribe(enumValue('v1', genesisHash), payload => {
      switch (payload.tag) {
        case 'v1':
          onMessage(payload.value);
          break;
        default:
          transport.provider.logger.error('Unknown message version', payload.tag);
      }
    });

    return {
      send(message) {
        hostApi.jsonrpc_message_send(enumValue('v1', [genesisHash, message]));
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
        .request('feature', enumValue('v1', { tag: 'chain', value: genesisHash }))
        .then(payload => {
          switch (payload.tag) {
            case 'v1': {
              return unwrapResultOrThrow(payload.value, e => new Error(e.reason));
            }
            default:
              throw new Error(`Unknown message version ${payload.tag}`);
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
