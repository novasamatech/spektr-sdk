export function callbackRaceResolver<T, R>(
  callback: (value: R) => unknown,
  preprocess: (value: T) => PromiseLike<R>,
): (value: T) => unknown {
  let abort = new AbortController();

  return async value => {
    abort.abort();
    abort = new AbortController();

    try {
      const result = await preprocess(value);

      if (abort.signal.aborted) {
        return;
      }

      callback(result);
    } catch {
      /* empty */
    }
  };
}
