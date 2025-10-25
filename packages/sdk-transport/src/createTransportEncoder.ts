import type { Codec, CodecType } from 'scale-ts';
import { enhanceCodec } from 'scale-ts';

export type TransportEncoder<Public, Transported extends Codec<any>> = {
  codec: Transported;
  from: (decoded: CodecType<Transported>) => Public;
  to: (value: Public) => CodecType<Transported>;
};

export function createTransportEncoder<Public, Transported extends Codec<any>>(
  encoder: TransportEncoder<Public, Transported>,
) {
  return enhanceCodec(encoder.codec, encoder.to, encoder.from);
}
