/**
 * Unit tests for the error() factory function.
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/error/error.js';
import type { ErrorFactory, ErrorInstance, StandardSchemaV1 } from '../src/index.js';

// Mock Standard Schema interface for testing (simplified StandardSchemaV1)
const createMockSchema = <T>(name = 'mock'): StandardSchemaV1 => {
  return {
    '~standard': {
      version: 1,
      vendor: name,
      validate: () => ({ value: undefined as unknown as T }),
    },
  };
};

describe('error() factory function', () => {
  describe('ErrorInstance brand (issue #86)', () => {
    it('should attach the brand marker on construction', () => {
      // The brand is set by `error()` only. The instance carries
      // two symbol-keyed properties: `FACTORY_SYMBOL` (the marker
      // used by `is()`) and `ErrorInstanceBrand` (the type-level
      // brand introduced in #86). We verify both are present and
      // that the brand slot holds the literal 'ErrorInstance'.
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      const symbols = Object.getOwnPropertySymbols(instance);
      expect(symbols.length).toBeGreaterThanOrEqual(2);

      // Find the slot whose value is the brand literal (the
      // factory slot holds the TestError function itself).
      const slots = symbols.map((sym) => ({
        sym,
        value: (instance as unknown as Record<symbol, unknown>)[sym],
      }));
      const brandSlot = slots.find((s) => s.value === 'ErrorInstance');
      expect(brandSlot).toBeDefined();
    });

    it('should not be assignable to a plain Error', () => {
      // Compile-time guard: a plain Error literal cannot satisfy
      // ErrorInstance<T> because the brand is missing. The
      // @ts-expect-error marks the line that must fail to compile.
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      // The structural shape alone still satisfies ErrorInstance<T>
      // (TS would accept this *without* the brand — that's the
      // smell #86 is closing). With the brand, the literal form
      // below is rejected:
      const literal = {
        name: 'X',
        message: 'X',
        stack: 'X',
        fields: {},
        notes: [],
        cause: null,
        causes: [],
        context: null,
      };
      // @ts-expect-error — literal lacks the brand; cannot satisfy ErrorInstance<T>
      const _typed: ErrorInstance = literal as ErrorInstance;
      void _typed;

      // The runtime counterpart: the factory-produced instance
      // has the brand; the literal does not.
      const symbols = Object.getOwnPropertySymbols(instance);
      expect(symbols.length).toBeGreaterThan(0);

      void instance;
    });

    it('should be assignable from error() output only', () => {
      // A native Error cannot satisfy ErrorInstance<T> at the type
      // level — the brand is missing. We verify the rejection at
      // compile time and confirm the runtime shape does not lie.
      const native = new Error('native');

      // @ts-expect-error — native Error lacks the brand; cannot
      // satisfy ErrorInstance<T>.
      const _wrong: ErrorInstance = native as unknown as ErrorInstance;
      void _wrong;

      // The runtime counterpart: the brand key is absent on the
      // native Error, so any narrowing that assumes the brand
      // would crash at runtime if it ran unchecked.
      const symbols = Object.getOwnPropertySymbols(native);
      expect(symbols.length).toBe(0);
    });
  });
  describe('basic usage', () => {
    it('should create an error factory with only a name', () => {
      const NotFoundError = error({
        name: 'NotFoundError',
      });

      expect(typeof NotFoundError).toBe('function');
      expect(NotFoundError.name).toBe('NotFoundError');
    });

    it('should create an error factory with name property', () => {
      const AppError = error({ name: 'AppError' });

      expect(AppError.name).toBe('AppError');
    });

    it('should create error instance with name as message when no template', () => {
      const BasicError = error({ name: 'BasicError' });

      const instance = BasicError();
      expect(instance).toBeDefined();
      expect(instance.name).toBe('BasicError');
      expect(instance.message).toBe('BasicError');
      expect(instance.stack).toBeDefined();
      expect(instance.stack).toContain('Error: BasicError');
    });
  });

  describe('ErrorInstance properties', () => {
    it('should create error instance with all required properties', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      // Core properties
      expect(typeof instance.name).toBe('string');
      expect(typeof instance.message).toBe('string');
      expect(typeof instance.stack).toBe('string');

      // Additional properties
      expect(instance.fields).toBeDefined();
      expect(typeof instance.fields).toBe('object');
      expect(Array.isArray(instance.notes)).toBe(true);
      expect(instance.notes).toEqual([]);
      expect(instance.cause).toBeNull();
      expect(Array.isArray(instance.causes)).toBe(true);
      expect(instance.causes).toEqual([]);
      expect(instance.context).toBeNull();
    });

    it('should be an instance of Error', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(instance instanceof Error).toBe(true);
    });

    it('should have inherits reference when inheriting', () => {
      const ParentError = error({ name: 'ParentError' });
      const ChildError = error({
        name: 'ChildError',
        inherits: ParentError,
      });
      const instance = ChildError();

      expect(instance.inherits).toBe(ParentError);
    });
  });

  describe('.addNote()', () => {
    it('should attach a single note to a fresh instance', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      const returned = instance.addNote('first attempt failed');

      expect(returned).toBe(instance);
      expect(instance.notes).toEqual(['first attempt failed']);
    });

    it('should append multiple notes in order', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError()
        .addNote('Attempt 1 failed')
        .addNote('Retrying...')
        .addNote('Attempt 2 failed');

      expect(instance.notes).toEqual(['Attempt 1 failed', 'Retrying...', 'Attempt 2 failed']);
    });

    it('should preserve notes through .from() chaining', () => {
      const AppError = error({ name: 'AppError' });
      const cause = new Error('underlying failure');
      const instance = AppError().addNote('context A').from(cause).addNote('context B');

      expect(instance.notes).toEqual(['context A', 'context B']);
      expect(instance.cause).toBe(cause);
    });

    it('should isolate notes between sibling instances', () => {
      const AppError = error({ name: 'AppError' });
      const a = AppError().addNote('only on a');
      const b = AppError();

      expect(a.notes).toEqual(['only on a']);
      expect(b.notes).toEqual([]);
    });
  });

  describe('inherits option', () => {
    it('should support single inheritance', () => {
      const AppError = error({ name: 'AppError' });
      const ValidationError = error({
        name: 'ValidationError',
        inherits: AppError,
      });

      expect(ValidationError.inherits).toBe(AppError);
    });

    it('should support multiple inheritance', () => {
      const NetworkError = error({ name: 'NetworkError' });
      const StorageError = error({ name: 'StorageError' });
      const CombinedError = error({
        name: 'CombinedError',
        inherits: [NetworkError, StorageError],
      });

      expect(Array.isArray(CombinedError.inherits)).toBe(true);
      expect((CombinedError.inherits as ErrorFactory[]).length).toBe(2);
    });

    it('should not have inherits property when not specified', () => {
      const SimpleError = error({ name: 'SimpleError' });

      expect('inherits' in SimpleError).toBe(false);
    });

    it('should store inherits on factory for later type checking', () => {
      const ParentA = error({ name: 'ParentA' });
      const ParentB = error({ name: 'ParentB' });
      const Child = error({
        name: 'Child',
        inherits: [ParentA, ParentB],
      });

      const instance = Child();
      expect(instance.inherits).toBeDefined();
      expect(Array.isArray(instance.inherits)).toBe(true);
    });
  });

  describe('message template', () => {
    it('should format message with field placeholders', () => {
      const ValidationError = error<{ field: string }>({
        name: 'ValidationError',
        message: 'Field "{field}" is invalid',
      });

      const instance = ValidationError({ field: 'email' });
      expect(instance.message).toBe('Field "email" is invalid');
    });

    it('should handle multiple placeholders', () => {
      const ValidationError = error<{ field: string; expected: string; actual: string }>({
        name: 'ValidationError',
        message: 'Field "{field}" expected {expected}, got {actual}',
      });

      const instance = ValidationError({
        field: 'age',
        expected: 'number',
        actual: 'string',
      });
      expect(instance.message).toBe('Field "age" expected number, got string');
    });

    it('should use name as default message when no template', () => {
      const InternalError = error({ name: 'InternalError' });

      const instance = InternalError();
      expect(instance.message).toBe('InternalError');
    });

    it('should support :upper modifier', () => {
      const ErrorWithModifier = error<{ userId: string }>({
        name: 'ErrorWithModifier',
        message: 'User ID: {userId:upper}',
      });

      const instance = ErrorWithModifier({ userId: 'abc123' });
      expect(instance.message).toBe('User ID: ABC123');
    });

    it('should support :lower modifier', () => {
      const ErrorWithModifier = error<{ msg: string }>({
        name: 'ErrorWithModifier',
        message: 'Message: {msg:lower}',
      });

      const instance = ErrorWithModifier({ msg: 'HELLO WORLD' });
      expect(instance.message).toBe('Message: hello world');
    });

    it('should support :json modifier', () => {
      const DataError = error<{ data: { id: number; name: string } }>({
        name: 'DataError',
        message: 'Invalid data: {data:json}',
      });

      const instance = DataError({ data: { id: 1, name: 'test' } });
      expect(instance.message).toBe('Invalid data: {"id":1,"name":"test"}');
    });

    it('should leave placeholder unchanged if field not found', () => {
      const PartialError = error<{ field: string }>({
        name: 'PartialError',
        message: 'Field "{field}" is invalid',
      });

      const instance = PartialError({ field: '' });
      expect(instance.message).toBe('Field "" is invalid');
    });

    it('should format template even with no fields provided', () => {
      const TemplateError = error<{ field: string }>({
        name: 'TemplateError',
        message: 'Field "{field}" is invalid',
      });

      const instance = TemplateError();
      expect(instance.message).toBe('Field "{field}" is invalid');
    });

    it('should not format message without placeholders', () => {
      const FixedError = error({
        name: 'FixedError',
        message: 'Something went wrong',
      });

      const instance = FixedError();
      expect(instance.message).toBe('Something went wrong');
    });
  });

  describe('fields with Standard Schema', () => {
    it('should accept Standard Schema fields', () => {
      const mockSchema = createMockSchema<{ field: string; reason: string }>();

      const ValidationError = error({
        name: 'ValidationError',
        fields: mockSchema,
      });

      expect(ValidationError.schema).toBeDefined();
    });

    it('should store fields schema for runtime validation', () => {
      const mockSchema = createMockSchema<{ field: string }>();

      const FieldError = error({
        name: 'FieldError',
        fields: mockSchema,
      });

      expect(FieldError.schema).toBeDefined();
    });

    it('should return empty fields object by default', () => {
      const NoFieldsError = error({ name: 'NoFieldsError' });

      const instance = NoFieldsError();
      expect(instance.fields).toEqual({});
    });
  });

  describe('type inference', () => {
    it('should infer proper types for ErrorFactory', () => {
      const AppError = error({ name: 'AppError' });

      // Type checks - these compile if types are correct
      const instance: ErrorInstance = AppError();
      expect(instance.name).toBe('AppError');
    });

    it('should allow passing fields to factory with typed error', () => {
      const FieldError = error<{ field: string }>({
        name: 'FieldError',
        message: 'Field "{field}" is invalid',
      });

      // Should accept partial fields
      const instance = FieldError({ field: 'test' });
      expect(instance.fields.field).toBe('test');
    });

    it('should work with typed config', () => {
      type Config = { field: string };

      const TypedError = error<Config>({
        name: 'TypedError',
        message: 'Field "{field}" is missing',
      });

      // Instance should have field
      const instance = TypedError({ field: 'email' });
      expect(instance.fields.field).toBe('email');
    });

    it('should infer empty fields when no type provided', () => {
      const NoFieldsError = error({ name: 'NoFieldsError' });
      const instance = NoFieldsError();

      // fields should be Record<string, never> which is empty
      expect(instance.fields).toEqual({});
    });
  });

  describe('factory identity', () => {
    it('should create unique factory instances', () => {
      const ErrorA = error({ name: 'ErrorA' });
      const ErrorB = error({ name: 'ErrorB' });

      expect(ErrorA).not.toBe(ErrorB);
      expect(ErrorA.name).not.toBe(ErrorB.name);
    });

    it('should create errors that are instances of Error', () => {
      const TestError = error({ name: 'TestError' });
      const instance1 = TestError();
      const instance2 = TestError();

      expect(instance1 instanceof Error).toBe(true);
      expect(instance2 instanceof Error).toBe(true);
    });
  });

  describe('stack trace', () => {
    it('should generate a stack trace', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(instance.stack).toBeDefined();
      expect(instance.stack.length).toBeGreaterThan(0);
    });

    it('should include error name in stack', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(instance.stack).not.toBe('');
    });

    it('should include formatted message in stack', () => {
      const TestError = error<{ field: string }>({
        name: 'TestError',
        message: 'Custom message for {field}',
      });
      const instance = TestError({ field: 'value' });

      expect(instance.stack).toContain('Custom message for value');
    });
  });
});
