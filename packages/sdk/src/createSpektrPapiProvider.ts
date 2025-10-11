import type { JsonRpcConnection, JsonRpcProvider } from '@polkadot-api/json-rpc-provider';
import { type HexString } from '@novasamatech/spektr-sdk-shared';
import { unwrapResponseOrThrow } from '@novasamatech/spektr-sdk-transport';
import { defaultTransport, type Transport } from './createTransport';

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

  const spektrProvider: JsonRpcProvider = onMessage => {
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

  const messagesPool = new Set<string>();

  return onMessage => {
    let connection: JsonRpcConnection | null;
    let disconnected = false;

    transport.isSpektrReady().then(ready => {
      if (disconnected) return;

      if (ready) {
        connection = spektrProvider(onMessage);
      } else {
        connection = fallback(onMessage);
      }

      messagesPool.forEach(message => {
        connection?.send(message);
      });
      messagesPool.clear();
    });

    return {
      send(message) {
        if (connection) {
          connection.send(message);
        } else {
          messagesPool.add(message);
        }
      },
      disconnect() {
        disconnected = true;
        if (connection) {
          connection.disconnect();
        }
      },
    };
  };
}
