import { Bytes, Enum, Struct, enhanceCodec, str, u8 } from 'scale-ts';

type TransportError = 'decryptionFailed' | 'decodingFailed' | 'unknown';

export const ResponseCode = enhanceCodec<number, TransportError>(
  u8,
  error => {
    switch (error) {
      case 'decryptionFailed':
        return 1;
      case 'decodingFailed':
        return 2;
      case 'unknown':
        return -1;
    }
  },
  code => {
    switch (code) {
      case 1:
        return 'decryptionFailed';
      case 2:
        return 'decodingFailed';
      default:
        return 'unknown';
    }
  },
);

export const RequestV1 = Struct({
  requestId: str,
  data: Bytes(),
});

export const ResponseV1 = Struct({
  requestId: str,
  responseCode: ResponseCode,
});

export const StatementData = Enum({
  requestV1: RequestV1,
  responseV1: ResponseV1,
});
