import { isValidMessage } from '@novasamatech/spektr-sdk-shared';
import type { TransportProvider } from '@novasamatech/spektr-sdk-transport';
import { createTransport } from '@novasamatech/spektr-sdk-transport';

function getParentWindow() {
  if (window.top) {
    return window.top;
  }
  throw new Error('No parent window found');
}

function isIframe() {
  try {
    return window !== window.top;
  } catch {
    return false;
  }
}

function createDefaultSdkProvider(): TransportProvider {
  const subscribers = new Set<(message: Uint8Array) => void>();

  const handleMessage = (event: MessageEvent) => {
    if (!isValidMessage(event, getParentWindow(), window)) return;

    for (const subscriber of subscribers) {
      subscriber(event.data);
    }
  };

  if (isIframe()) {
    window.addEventListener('message', handleMessage);
  }

  return {
    isCorrectEnvironment() {
      return isIframe();
    },
    postMessage(message) {
      getParentWindow().postMessage(message, '*', [message.buffer]);
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    dispose() {
      subscribers.clear();
      if (isIframe()) {
        window.removeEventListener('message', handleMessage);
      }
    },
  };
}

export const defaultProvider = createDefaultSdkProvider();
export const defaultTransport = createTransport(defaultProvider, { handshakeTimeout: 1_000 });
