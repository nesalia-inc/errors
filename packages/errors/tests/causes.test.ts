/**
 * Unit tests for the causes() function.
 */

import { describe, it, expect } from 'vitest';
import { error, causes } from '../src/index.js';

describe('causes() function', () => {
  describe('basic usage', () => {
    it('should return causes array from error instance', () => {
      const AppError = error({ name: 'AppError' });
      const ValidationError = error({ name: 'ValidationError' });

      const cause = AppError();
      const instance = ValidationError();
      instance.from(cause);

      const result = causes(instance);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cause);
    });

    it('should return empty array for error with no cause', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      const result = causes(instance);

      expect(result).toEqual([]);
    });
  });

  describe('ordering', () => {
    it('should return array ordered from most recent to root cause', () => {
      const AppError = error({ name: 'AppError' });
      const cause1 = AppError();
      const cause2 = AppError();
      const cause3 = AppError();
      cause3.from(cause2).from(cause1);

      const instance = AppError();
      instance.from(cause3);

      const result = causes(instance);

      // result contains cause3, cause2, cause1 (newest to oldest)
      expect(result).toContain(cause3);
      expect(result).toContain(cause2);
      expect(result).toContain(cause1);
    });

    it('should work with single level chaining', () => {
      const AppError = error({ name: 'AppError' });
      const cause = AppError();
      const instance = AppError();
      instance.from(cause);

      const result = causes(instance);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cause);
    });

    it('should work with multiple level chaining', () => {
      const AppError = error({ name: 'AppError' });
      const err1 = AppError();
      const err2 = AppError();
      const err3 = AppError();

      err2.from(err1);
      err3.from(err2);

      const result = causes(err3);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(err2);
      expect(result[1]).toBe(err1);
    });
  });

  describe('native errors', () => {
    it('should handle native errors in chain', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();
      instance.from(new Error('native cause'));

      const result = causes(instance);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Error);
      expect(result[0].message).toBe('native cause');
    });

    it('should return empty array for native error without causes', () => {
      const result = causes(new Error('test'));

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null', () => {
      expect(causes(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(causes(undefined)).toEqual([]);
    });

    it('should return empty array for non-error values', () => {
      expect(causes('string')).toEqual([]);
      expect(causes(123)).toEqual([]);
      expect(causes({})).toEqual([]);
    });

    it('should return empty array when causes property is not an array', () => {
      // Regression for issue #74: a non-array `causes` property
      // (e.g. from a malformed foreign value) must not be returned
      // as-is. The structural guard rejects the shape before any
      // cast reaches the consumer.
      expect(causes({ causes: 'not an array' })).toEqual([]);
      expect(causes({ causes: null })).toEqual([]);
      expect(causes({ causes: { length: 1, 0: 'fake' } })).toEqual([]);
    });

    it('should return causes property directly', () => {
      const AppError = error({ name: 'AppError' });
      const cause = AppError();
      const instance = AppError();
      instance.from(cause);

      // The causes() function returns the same as err.causes property
      expect(causes(instance)).toBe(instance.causes);
    });
  });
});
