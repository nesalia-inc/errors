/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 *
 * The internal implementation is a class (`ErrorInstanceImpl`,
 * not exported). The class owns the brand marker, the methods, and
 * the mutable state. The factory function `error()` returns an
 * instance of that class; consumers never see the class symbol
 * (rule 0014: functions over classes for public API).
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { ErrorFactory, ErrorInstance } from './types.js';
import { ErrorInstanceBrand } from './types.js';
import { captureStack } from './capture.js';
import { formatTemplate, hasTemplatePlaceholders } from './format.js';

// ============================================================================
// Symbols for identity (declared before the class that references them)
// ============================================================================

/**
 * Symbol used by `is()` to discriminate factory-created errors at
 * runtime. Declared as a class property on `ErrorInstanceImpl`; the
 * constructor assigns the factory function to this slot. Read by
 * `is/index.ts`.
 *
 * @internal
 */
const FACTORY_SYMBOL = Symbol.for('@deessejs/errors/factory');

// ============================================================================
// Internal implementation
// ============================================================================

/**
 * Internal error instance class. Owns the brand marker, the
 * factory marker, the methods (`addNote`, `from`), and the
 * mutable state (`notes`, `causes`, `context`).
 *
 * The class extends `Error` so that `instance instanceof Error`
 * returns `true`. The factory marker is a class property assigned
 * in the constructor; the brand marker is a class property
 * initialised at the field declaration. No post-hoc property
 * assignment is needed at the call site.
 *
 * The class is **not exported**. Consumers see only the `ErrorInstance<T>`
 * type alias from `types.ts`, which is structurally compatible
 * with this class but does not expose the constructor. The
 * only way to mint an instance is `error()`, the factory function
 * exported below.
 *
 * @internal
 */
class ErrorInstanceImpl<TFields extends Record<string, unknown>> extends Error {
  readonly [ErrorInstanceBrand] = 'ErrorInstance' as const;
  readonly [FACTORY_SYMBOL]: ErrorFactory<TFields>;
  // `override` narrows the inherited `Error.stack` from `string | undefined`
  // to `string`. The constructor sets it unconditionally; the runtime
  // invariant is "always defined".
  override stack: string;
  fields: TFields;
  notes: string[] = [];
  cause: Error | null = null;
  causes: Error[] = [];
  context: Record<string, unknown> | null = null;
  inherits?: ErrorFactory | ErrorFactory[];

  constructor(
    name: string,
    message: string,
    stack: string,
    fields: TFields,
    factory: ErrorFactory<TFields>,
    inherits?: ErrorFactory | ErrorFactory[]
  ) {
    super(message);
    this.name = name;
    this.stack = stack;
    this.fields = fields;
    this.inherits = inherits;
    this[FACTORY_SYMBOL] = factory;
  }

  /**
   * Adds a note to this error instance. Patterned after Python 3.11's
   * `BaseException.add_note()` (PEP 678).
   */
  addNote(note: string): ErrorInstance<TFields> {
    this.notes.push(note);
    return this;
  }

  /**
   * Chains a cause error to this error. The new cause is prepended
   * to the chain so the returned `causes` array is ordered
   * newest-first.
   */
  from(cause: Error | ErrorInstance): ErrorInstance<TFields> {
    const causeCauses = 'causes' in cause && Array.isArray(cause.causes) ? cause.causes : [];
    this.causes = [cause, ...causeCauses, ...this.causes];
    this.cause = cause;
    return this;
  }
}

// ============================================================================
// Internal factory class
// ============================================================================

/**
 * Internal factory class. Owns the factory's metadata (`name`,
 * `inherits`, `schema`, `rawMessage`) and the `create` method that
 * mints `ErrorInstance` instances.
 *
 * The class is **not exported**. The factory function `error()`
 * returns a callable bound to the instance; consumers see only
 * the `ErrorFactory<T>` type alias from `types.ts`. Rule 0014
 * (functions over classes for public API) is satisfied because
 * the constructor is not exposed.
 *
 * @internal
 */
class ErrorFactoryImpl<TFields extends Record<string, unknown>> {
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  schema?: StandardSchemaV1;
  rawMessage?: string;

  constructor(
    name: string,
    inherits?: ErrorFactory | ErrorFactory[],
    schema?: StandardSchemaV1,
    rawMessage?: string
  ) {
    this.name = name;
    this.inherits = inherits;
    this.schema = schema;
    this.rawMessage = rawMessage;
  }

  /**
   * Mint a new `ErrorInstance<TFields>` from this factory's
   * configuration. The factory's `name`, `message`, `inherits` are
   * captured in the closure; the input `fields` parameter is the
   * user-supplied field values.
   *
   * The `factory` parameter is the *public* callable (the value
   * returned by `error()`), not the internal `ErrorFactoryImpl`
   * instance. `is()` discriminates by reference equality against
   * the consumer's callable; passing the internal instance would
   * silently break that equality.
   */
  create(
    input: Partial<TFields> | undefined,
    factory: ErrorFactory<TFields>
  ): ErrorInstance<TFields> {
    const fieldsData = (input || {}) as TFields;

    // Format message if template has placeholders
    let errorMessage = this.name;
    if (this.rawMessage && hasTemplatePlaceholders(this.rawMessage)) {
      errorMessage = formatTemplate(this.rawMessage, fieldsData);
    } else if (this.rawMessage) {
      errorMessage = this.rawMessage;
    }

    // Capture stack trace
    const stack = captureStack(errorMessage);

    return new ErrorInstanceImpl<TFields>(
      this.name,
      errorMessage,
      stack,
      fieldsData,
      factory,
      this.inherits
    );
  }
}

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
 * ```typescript
 * // Multiple inheritance
 * const NetworkError = error({ name: 'NetworkError' });
 * const StorageError = error({ name: 'StorageError' });
 * const CombinedError = error({
 *   name: 'CombinedError',
 *   inherits: [NetworkError, StorageError],
 * });
 * ```
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

// ============================================================================
// Exports for is() function
// ============================================================================

export { FACTORY_SYMBOL };
