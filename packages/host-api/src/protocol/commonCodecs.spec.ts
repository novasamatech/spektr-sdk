import { Struct, _void, bool } from 'scale-ts';
import { describe, expect, it } from 'vitest';

import { Err, ErrEnum, Hex, Status } from './commonCodecs.js';

describe('Common codecs', () => {
  describe('Hex', () => {
    it('should correctly encode/decode Hex with arbitrary length', () => {
      const hex = '0xffffff';
      const codec = Hex();

      expect(codec.enc(hex)).toEqual(new Uint8Array([12, 255, 255, 255]));
      expect(codec.dec(codec.enc(hex))).toEqual(hex);
    });
    it('should correctly encode/decode Hex with fixed length', () => {
      const hex = '0xffffff';
      const codec = Hex(3);

      expect(codec.enc(hex)).toEqual(new Uint8Array([255, 255, 255]));
      expect(codec.dec(codec.enc(hex))).toEqual(hex);
    });
  });

  describe('Status', () => {
    it('should correctly encode/decode Status', () => {
      const codec = Status('New', 'Used');

      expect(codec.enc('New')).toEqual(new Uint8Array([0]));
      expect(codec.enc('Used')).toEqual(new Uint8Array([1]));

      expect(codec.dec('0x00')).toEqual('New');
      expect(codec.dec('0x01')).toEqual('Used');

      // @ts-expect-error for test
      expect(() => codec.enc('Unknown')).toThrowErrorMatchingInlineSnapshot(`[Error: Unknown status value: Unknown]`);
      expect(() => codec.dec('0x03')).toThrowErrorMatchingInlineSnapshot(`[Error: Unknown status index: 3]`);
    });
  });

  describe('Err', () => {
    it('should correctly construct Error', () => {
      const ErrorCodec = Err('TestError', _void, 'Test message');
      const error = new ErrorCodec(undefined);

      expect(error).toBeInstanceOf(ErrorCodec);
      expect(error.name).toBe('TestError');
      expect(error.message).toBe('Test message');
    });

    it('should correctly encode/decode Err', () => {
      const payload = Struct({ enable: bool });
      const ErrorCodec = Err('TestError', payload, 'Test message');
      const error = new ErrorCodec({ enable: true });

      expect(ErrorCodec.enc(error)).toEqual(new Uint8Array([1]));
      expect(ErrorCodec.dec(ErrorCodec.enc(error))).toEqual(new ErrorCodec({ enable: true }));
    });
  });

  describe('ErrEnum', () => {
    it('should correctly construct ErrorEnum field', () => {
      const ErrorCodec = ErrEnum('ErrorCodec', {
        TestError: [_void, 'Test message'],
      });

      const error = new ErrorCodec.TestError(undefined);

      expect(error).toBeInstanceOf(ErrorCodec.TestError);
      expect(error.name).toBe('ErrorCodec::TestError');
      expect(error.message).toBe('Test message');
    });

    it('should correctly serialize/deserialize', () => {
      const ErrorCodec = ErrEnum('ErrorCodec', {
        First: [_void, 'First'],
        Second: [_void, 'Second'],
      });

      const first = new ErrorCodec.First(undefined);
      const second = new ErrorCodec.Second(undefined);

      expect(ErrorCodec.enc(first)).toEqual(new Uint8Array([0]));
      expect(ErrorCodec.enc(second)).toEqual(new Uint8Array([1]));

      expect(ErrorCodec.dec(ErrorCodec.enc(first))).toEqual(first);
      expect(ErrorCodec.dec(ErrorCodec.enc(second))).toEqual(second);

      expect(ErrorCodec.dec(ErrorCodec.enc(first))).not.toEqual(second);
      expect(ErrorCodec.dec(ErrorCodec.enc(second))).not.toEqual(first);
    });
  });
});
