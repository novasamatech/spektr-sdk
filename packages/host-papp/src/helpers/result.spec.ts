import { describe, expect, it } from 'vitest';

import { err, ok, seq } from './result.js';

describe('Result', () => {
  describe('seq', () => {
    it('should concat ok values', () => {
      expect(seq(ok(1), ok('2')).unwrap()).toEqual([1, '2']);
    });

    it('should fallback to err', () => {
      expect(seq(ok(1), err('2')).unwrapErr()).toEqual('2');
      expect(seq(err(1), ok('2')).unwrapErr()).toEqual(1);
    });
  });
});
