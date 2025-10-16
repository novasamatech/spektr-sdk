import { isValidMessage } from '@novasamatech/spektr-sdk-shared';
import type { TransportProvider } from '@novasamatech/spektr-sdk-transport';

function hasWindow() {
  try {
    return typeof window !== 'undefined';
  } catch {
    return false;
  }
}

export function createIframeProvider(iframe: HTMLIFrameElement, url: string): TransportProvider {
  iframe.src = url;

  let disposed = false;
  let iframePromise: Promise<Window | null> | null = null;
  const subscribers = new Set<(message: Uint8Array) => void>();

  function waitForIframe(callback: (iframe: Window | null) => void) {
    if (iframe.contentWindow) {
      return callback(iframe.contentWindow);
    }

    if (iframePromise) {
      iframePromise.then(callback);
      return;
    }

    iframePromise = new Promise<Window | null>(resolve => {
      iframe.addEventListener(
        'load',
        () => {
          resolve(iframe.contentWindow ?? null);
          callback(iframe.contentWindow ?? null);
          iframePromise = null;
        },
        { once: true },
      );
    });
  }

  const messageHandler = (event: MessageEvent) => {
    if (disposed) return;
    waitForIframe(iframe => {
      if (disposed) return;
      if (!iframe) return;
      if (!isValidMessage(event, iframe, window)) return;

      for (const subscriber of subscribers) {
        subscriber(event.data);
      }
    });
  };

  if (hasWindow()) {
    window.addEventListener('message', messageHandler);
  }

  return {
    isCorrectEnvironment() {
      return hasWindow();
    },
    postMessage(message) {
      if (disposed) return;

      waitForIframe(iframe => {
        if (!iframe) return;
        if (disposed) return;

        iframe.postMessage(message, '*', [message.buffer]);
      });
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    dispose() {
      disposed = true;
      iframe.src = '';
      iframePromise = null;
      subscribers.clear();

      if (hasWindow()) {
        window.removeEventListener('message', messageHandler);
      }
    },
  };
}
