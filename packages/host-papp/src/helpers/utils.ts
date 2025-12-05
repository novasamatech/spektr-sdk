export function isAbortError(err: object) {
  return err && 'name' in err && err.name === 'AbortError';
}
