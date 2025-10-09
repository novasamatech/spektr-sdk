export type HexString = `0x${string}`;

export const HANDSHAKE_INTERVAL = 100;

export function isValidMessage(event: MessageEvent, source: Window, currentWindow: Window) {
  return (
    event.source !== currentWindow &&
    event.source === source &&
    event.data &&
    'constructor' &&
    event.data &&
    event.data.constructor.name === 'Uint8Array'
  );
}

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export const promiseWithResolvers = <T>(): PromiseWithResolvers<T> => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // @ts-expect-error before assign
  return { promise, resolve, reject };
};
