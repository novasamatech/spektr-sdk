export class AbortError extends Error {
  constructor(message?: string) {
    super(message);
  }

  static isAbortError(err: unknown) {
    return err instanceof AbortError;
  }
}
