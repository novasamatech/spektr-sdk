import type { HexString, Transport, TxPayloadV1 } from '@novasamatech/host-api';
import { unwrapResponseOrThrow } from '@novasamatech/host-api';
import { injectExtension } from '@polkadot/extension-inject';
import type { InjectedAccounts } from '@polkadot/extension-inject/types';
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types/extrinsic';

import { SpektrExtensionName, Version } from './constants.js';
import { defaultTransport } from './defaultTransport.js';

interface Signer {
  /**
   * @description signs an extrinsic payload from a serialized form
   */
  signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;
  /**
   * @description signs a raw payload, only the bytes data as supplied
   */
  signRaw?: (raw: SignerPayloadRaw) => Promise<SignerResult>;
  /**
   * @description signs a transaction according to https://github.com/polkadot-js/api/issues/6213
   */
  createTransaction?: (payload: TxPayloadV1) => Promise<HexString>;
}

interface Injected {
  accounts: InjectedAccounts;
  signer: Signer;
}

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
              transport.provider.logger.error('Failed response on account subscription', payload.value);
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
        createTransaction(payload) {
          return transport
            .request({ tag: 'createTransactionRequestV1', value: payload }, 'createTransactionResponseV1')
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
    transport.provider.logger.error('Error injecting extension', e);
    return false;
  }
}
