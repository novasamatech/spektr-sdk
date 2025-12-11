export function isAbortError(err: object) {
  return err && 'name' in err && err.name === 'AbortError';
}

export function toError(err: unknown) {
  if (err instanceof Error) {
    return err;
  }

  if (err) {
    return new Error(err.toString());
  }

  return new Error('Unknown error occurred.');
}

export function nonNullable<T>(value: T): value is Exclude<NonNullable<T>, void> {
  return value !== null && value !== undefined;
}
