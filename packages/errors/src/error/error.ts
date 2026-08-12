/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Public surface of the `error()` factory. The internal classes
 * (`ErrorInstanceImpl`, `ErrorFactoryImpl`) live in `./internal/`
 * and are not exported. Consumers see only the `ErrorFactory<T>`
 * and `ErrorInstance<T>` type aliases from `types.ts`.
 *
 * Rule 0014 (functions over classes for public API) is satisfied:
 * the consumer-facing factory is a function; the classes are
 * implementation details.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { ErrorFactory, ErrorInstance } from './types.js';
import { ErrorFactoryImpl } from './internal/error-factory-impl.js';

/**
 * Build a callable factory bound to a given `ErrorFactoryImpl`
 * instance. The callable carries the public type signature
 * (a function with metadata properties); the implementation
 * delegates to `impl.create`.
 *
 * The callable is built in two passes: first the underlying
 * function (which closes over `impl` and the `callable` reference
 * via a late binding), then the metadata is attached. The
 * `factory` parameter to `impl.create` is the outer callable
 * itself, so `is()` discriminates by reference equality against
 * the consumer's callable.
 */
const factoryCallable = <TFields extends Record<string, unknown>>(
  impl: ErrorFactoryImpl<TFields>
): ErrorFactory<TFields> => {
  // The placeholder is rebound below; the closure captures the
  // outer `callable` via a let binding so `impl.create` can pass
  // it back to the ErrorInstanceImpl constructor.
  const callable = ((input?: Partial<TFields>): ErrorInstance<TFields> =>
    impl.create(input, callable)) as ErrorFactory<TFields>;
  // Attach metadata as own properties so the consumer sees the
  // public shape (callable + name + inherits + schema + rawMessage).
  // Function `name` is read-only in JS — use `defineProperty` to
  // set it without a `as` cast.
  Object.defineProperty(callable, 'name', {
    value: impl.name,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  if (impl.inherits !== undefined) callable.inherits = impl.inherits;
  if (impl.schema !== undefined) callable.schema = impl.schema;
  if (impl.rawMessage !== undefined) callable.rawMessage = impl.rawMessage;
  return callable;
};

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Creates an error factory function for defining typed, structured errors.
 *
 * @param config - Error configuration
 * @param config.name - Error name identifier
 * @param config.fields - Standard Schema field definitions (Zod, Valibot, ArkType, etc.)
 * @param config.inherits - Parent error factory to inherit from
 * @param config.message - Message template with {field} placeholders
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   fields: z.object({
 *     field: z.string(),
 *     reason: z.string(),
 *   }),
 *   message: 'Field "{field}" is invalid: {reason}',
 * });
 *
 * const err = ValidationError({ field: 'email', reason: 'invalid format' });
 * // err.message === 'Field "email" is invalid: invalid format'
 * ```
 *
 * @example
 * ```typescript
 * // Single inheritance
 * const AppError = error({ name: 'AppError' });
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   inherits: AppError,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Multiple inheritance
 * const NetworkError = error({ name: 'NetworkError' });
 * const StorageError = error({ name: 'StorageError' });
 * const CombinedError = error({
 *   name: 'CombinedError',
 *   inherits: [NetworkError, StorageError],
 * });
 * ```
 */
export const error = <const T extends Record<string, unknown> = Record<string, never>>(config: {
  name: string;
  fields?: StandardSchemaV1;
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
}): ErrorFactory<T> => {
  const impl = new ErrorFactoryImpl<T>(config.name, config.inherits, config.fields, config.message);
  return factoryCallable<T>(impl);
};
