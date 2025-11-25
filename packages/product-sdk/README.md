# @novasamatech/product-sdk

Easy way to embed Polkadot host functionality into your dapp.

## Overview

Spektr SDK provides a set of tools to integrate your application with Spektr dapp browser.
Core features:
- Generic account provider similar to [polkadot-js extension](https://polkadot.js.org/extension/).
- Redirect [PAPI](https://papi.how/) requests to host application
- Receive additional information from host application - supported chains, theme, etc.

## Installation

```shell
npm install @novasamatech/product-sdk --save -E
```

## Usage

### Injecting account provider into `injectedWeb3` interface

Spektr SDK can provide account information and signers with same interface as any other polkadot compatible wallet.

```ts
import { injectSpektrExtension, SpektrExtensionName } from '@novasamatech/product-sdk';
import { connectInjectedExtension, type InjectedPolkadotAccount } from '@polkadot-api/pjs-signer';

async function getSpektrExtension() {
  const ready = await injectSpektrExtension();

  if (ready) {
    return connectInjectedExtension(SpektrExtensionName)
  }

  return null;
}

async function getAccounts(): Promise<InjectedPolkadotAccount[]> {
  const extension = await getSpektrExtension();

  if (extension) {
    return extension.getAccounts()
  }

  // fallback to other providers
  return [];
}
```

### Redirecting PAPI requests to host application

You can wrap your PAPI provider with spektr provider to support redirecting requests to host application.

```diff
import { createClient, type PolkadotClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider';
import { createSpektrPapiProvider, WellKnownChain } from '@novasamatech/product-sdk';

function createPapiClient(): PolkadotClient {
  const polkadotEndpoint = 'wss://...';

-  const provider = getWsProvider(polkadotEndpoint);
+  const provider = createSpektrPapiProvider({
+    chainId: WellKnownChain.polkadotRelay,
+    fallback: getWsProvider(polkadotEndpoint),
+  });

  return createClient(provider);
}
```

### Subscribing metadata and statuses

```ts
import { spektrMetaProvider } from '@novasamatech/product-sdk';

const unsubscribe = spektrMetaProvider.subscribeConnectionStatus((status) => {
  console.log('connection status changed', status);
});
```

