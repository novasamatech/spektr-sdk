import type { HexString, Transport } from '@novasamatech/host-api';
import { createHostApi, enumValue, unwrapResultOrThrow } from '@novasamatech/host-api';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { getSyncProvider } from '@polkadot-api/json-rpc-provider-proxy';

import { defaultTransport } from './defaultTransport.js';

type InternalParams = {
  transport?: Transport;
};

export function createPapiProvider(genesisHash: HexString, internal?: InternalParams): JsonRpcProvider {
  const version = 'v1';
  const transport = internal?.transport ?? defaultTransport;
  if (!transport.isCorrectEnvironment()) {
    throw new Error('PapiProvider can only be used in a product environment');
  }

  const hostApi = createHostApi(transport);

  const spektrProvider: JsonRpcProvider = onMessage => {
    const subscription = hostApi.jsonrpcMessageSubscribe(enumValue(version, genesisHash), payload => {
      switch (payload.tag) {
        case version:
          onMessage(payload.value);
          break;
        default:
          transport.provider.logger.error('Unknown message version', payload.tag);
      }
    });

    return {
      send(message) {
        hostApi.jsonrpcMessageSend(enumValue(version, [genesisHash, message]));
      },
      disconnect() {
        subscription.unsubscribe();
      },
    };
  };

  function checkIfReady() {
    return transport.isReady().then(ready => {
      if (!ready) return false;

      return transport
        .request('feature', enumValue('v1', enumValue('Chain', genesisHash)))
        .then(payload => {
          switch (payload.tag) {
            case 'v1': {
              return unwrapResultOrThrow(payload.value, e => new Error(e.payload.reason));
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

  return getSyncProvider(() =>
    checkIfReady().then(ready => {
      if (ready) return spektrProvider;
      throw new Error(`Chain ${genesisHash} not supported by host`);
    }),
  );
}
