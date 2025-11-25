import type { Codec, CodecType } from 'scale-ts';
import { enhanceCodec } from 'scale-ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransportEncoder<Public, Transported extends Codec<any>> = {
  codec: Transported;
  from: (decoded: CodecType<Transported>) => Public;
  to: (value: Public) => CodecType<Transported>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTransportEncoder<Public, Transported extends Codec<any>>(
  encoder: TransportEncoder<Public, Transported>,
) {
  return enhanceCodec(encoder.codec, encoder.to, encoder.from);
}
