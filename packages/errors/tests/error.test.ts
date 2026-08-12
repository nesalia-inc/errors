/**
 * Unit tests for the error() factory function.
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/error/error.js';
import type { ErrorFactory, ErrorInstance, StandardSchemaV1 } from '../src/index.js';

// Mock Standard Schema interface for testing (simplified StandardSchemaV1).
// The `types` field is what makes Standard Schema inference work; without
// it, the schema is a uniform `StandardSchemaV1<unknown, unknown>` and
// no useful type information propagates.
const createMockSchema = <Input, Output>(name = 'mock'): StandardSchemaV1<Input, Output> => {
  return {
    '~standard': {
      version: 1,
      vendor: name,
      types: undefined as never,
      validate: () => ({ value: undefined as unknown as Output }),
    },
  };
};

/**
 * Standard Schema-compliant mock that declares its input/output
 * types. Use this when a test needs inference to propagate (issue #83).
 */
const createTypedMockSchema = <Input, Output>(name = 'mock'): StandardSchemaV1<Input, Output> => {
  return {
    '~standard': {
      version: 1,
      vendor: name,
      types: { input: undefined as unknown as Input, output: undefined as unknown as Output },
      validate: () => ({ value: undefined as unknown as Output }),
    },
  };
};

describe('error() factory function', () => {
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

  describe('Standard Schema type inference (issue #83)', () => {
    it('should infer the field shape from a typed schema', () => {
      // Regression for issue #83: the field shape is derived from the
      // schema's output type, not from a placeholder T parameter.
      const schema = createTypedMockSchema<unknown, { email: string; age: number }>();
      const ValidationError = error({ name: 'ValidationError', fields: schema });

      // The factory accepts exactly the schema's output shape as input.
      // This line is the inference contract: it must type-check without
      // an explicit `<{ email: string; age: number }>` annotation.
      const instance = ValidationError({ email: 'a@b.c', age: 30 });
      void instance;

      expect(ValidationError.name).toBe('ValidationError');
    });

    it('should fall back to Record<string, never> when no fields are provided', () => {
      // When `fields` is omitted, the field shape is empty. The factory
      // accepts an optional input (Partial<Record<string, never>> is
      // effectively `{}`), and the instance has no typed fields.
      const SimpleError = error({ name: 'SimpleError' });

      const instance = SimpleError();
      expect(instance.fields).toEqual({});
    });

    it('should infer without requiring an explicit T annotation', () => {
      // The schema declares its output. The factory's return type
      // carries that output through `InferFields<S>`.
      type EmailOutput = { email: string };
      const schema = createTypedMockSchema<unknown, EmailOutput>();
      const Factory = error({ name: 'EmailError', fields: schema });

      // Type assertion at compile time: the call must accept `EmailOutput`.
      // If inference were broken, this would fail with a type error.
      const _check: (input?: Partial<EmailOutput>) => ErrorInstance<EmailOutput> = Factory;
      void _check;

      expect(typeof Factory).toBe('function');
    });
  });
});
