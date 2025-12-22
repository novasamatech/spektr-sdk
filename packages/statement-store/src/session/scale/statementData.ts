import type { Codec } from 'scale-ts';
import { Enum, Struct, Vector, enhanceCodec, str, u8 } from 'scale-ts';

export type ResponseCode = 'success' | 'decryptionFailed' | 'decodingFailed' | 'unknown';

export const ResponseCodeCodec = enhanceCodec<number, ResponseCode>(
  u8,
  error => {
    switch (error) {
      case 'success':
        return 0;
      case 'decryptionFailed':
        return 1;
      case 'decodingFailed':
        return 2;
      case 'unknown':
        return 255;
    }
  },
  code => {
    switch (code) {
      case 0:
        return 'success';
      case 1:
        return 'decryptionFailed';
      case 2:
        return 'decodingFailed';
      default:
        return 'unknown';
    }
  },
);

export const Request = <T>(data: Codec<T>) => {
  return Struct({
    requestId: str,
    data: Vector(data),
  });
};

export const Response = Struct({
  requestId: str,
  responseCode: ResponseCodeCodec,
});

export const StatementData = <T>(data: Codec<T>) => {
  return Enum({
    request: Request(data),
    response: Response,
  });
};
