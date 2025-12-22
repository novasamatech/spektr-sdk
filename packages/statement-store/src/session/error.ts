export class DecryptionError extends Error {
  constructor() {
    super('Decryption error: failed to decrypt the request');
  }
}

export class DecodingError extends Error {
  constructor() {
    super('Decoding error: failed to decode the request');
  }
}

export class UnknownError extends Error {
  constructor() {
    super('Unknown error during request.');
  }
}
