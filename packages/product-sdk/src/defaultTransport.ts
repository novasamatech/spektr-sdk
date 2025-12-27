import type { TransportProvider } from '@novasamatech/host-api';
import { createDefaultLogger, createTransport } from '@novasamatech/host-api';

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

function isValidMessage(event: MessageEvent, sourceEnv: MessageEventSource, currentEnv: MessageEventSource) {
  return (
    event.source !== currentEnv &&
    event.source === sourceEnv &&
    event.data &&
    event.data.constructor.name === 'Uint8Array'
  );
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
    logger: createDefaultLogger(),
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
export const defaultTransport = createTransport(defaultProvider);
