# @novasamatech/spektr-dapp-host-container

A robust solution for hosting and managing decentralized applications (dapps) within the Polkadot ecosystem.

## Overview

Host container provides the infrastructure layer for securely embedding and communicating with third-party dapps.
It handles the isolation boundary, message routing, lifecycle management, and security concerns inherent in hosting untrusted web content.

## Installation

```shell
npm install @novasamatech/spektr-dapp-host-container --save -E
```

### Basic Container Setup

```ts
import { createContainer, createIframeProvider } from '@novasamatech/spektr-dapp-host-container';

const iframe = document.createElement('iframe');

const provider = createIframeProvider(iframe, 'https://dapp.example.com');
const container = createContainer(provider);

document.body.appendChild(iframe);
```

### Accounts handling

To handle account requests and subscriptions you can call `handleAccounts` method:

```ts
container.handleAccounts({
  async get() {
    // return injected accounts
    return [];
  },
  subscribe(callback) {
    // subscribe to account changes
    
    callback([]);
    return () => {
      // unsubscribe
    };
  },
});
```

In this case you also should handle sign requests:

```ts
container.handleSignRequest({
  signRaw(raw) {
    // return signed payload based on raw data
    return {
      id: 0,
      signature: '0x...',
      signedTransaction: '0x...',
    }
  },
  signPayload(payload) {
    // return signed payload based on sign payload
    return {
      id: 0,
      signature: '0x...',
      signedTransaction: '0x...',
    }
  },
});
```

### PAPI provider support

Dapp container supports [PAPI](https://papi.how/) requests redirecting from dapp to host container.
It can be useful to deduplicate socket connections or light client instances between multiple dapps.

To support this feature you should add two additional handlers to container:

#### Chain support check
```ts
const polkadotGenesisHash = '0x...';

container.handleChainSupportCheck(async (genesisHash) => {
  return genesisHash === polkadotGenesisHash;
});
```

#### Provider implementation

```ts
import { getWsProvider } from 'polkadot-api/ws-provider';

const polkadotGenesisHash = '0x...';
const endpoint = 'wss://...';
const provider = getWsProvider(endpoint);

container.connectToPapiProvider(polkadotGenesisHash, provider);
```

### Additional metadata sync

#### Receiving connection status

```ts
const unsubscribe = container.subscribeConnectionStatus((status) => {
  console.log('connection status changed', status);
});
```

#### Receiving dapp location change

```ts
const unsubscribe = container.subscribeLocationChange((location) => {
  console.log('dapp location changed:', location);
});
```

### Known pitfalls

#### CSP error on iframe loading
If dapp is hosted on different domain than container and uses https, you should add this meta tag to your host application html:

```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```
