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
// Internal implementation
// ============================================================================

/**
 * Internal error instance class. Owns the brand marker, the
 * methods (`addNote`, `from`), and the mutable state (`notes`,
 * `causes`, `context`).
 *
 * The class extends `Error` so that `instance instanceof Error`
 * returns `true`. The `Object.setPrototypeOf(this, new.target.prototype)`
 * call in the constructor restores the prototype chain that
 * subclassing `Error` breaks in ES2015+.
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
    inherits?: ErrorFactory | ErrorFactory[]
  ) {
    super(message);
    // Restore prototype chain (TS-recommended pattern for extending Error).
    Object.setPrototypeOf(this, new.target.prototype);
    // `name` and `stack` are inherited from `Error` but the type
    // declaration marks them as required strings. Reassign them
    // here so the runtime invariant (always defined) holds without
    // a type-system lie.
    this.name = name;
    this.stack = stack;
    this.fields = fields;
    this.inherits = inherits;
  }

  /**
   * Adds a note to this error instance. Patterned after Python 3.11's
   * `BaseException.add_note()` (PEP 678).
   *
   * The return type is `ErrorInstance<TFields>` (the public type),
   * not `this`; `this` is `ErrorInstanceImpl<TFields>`, whose
   * inherited `Error.stack` is `string | undefined` and conflicts
   * with the narrower `ErrorInstance<TFields>`. The cast at the
   * return site bridges the two — the runtime invariant (always
   * defined) holds because the constructor sets `stack`.
   */
  addNote(note: string): ErrorInstance<TFields> {
    this.notes.push(note);
    return this as unknown as ErrorInstance<TFields>;
  }

  /**
   * Chains a cause error to this error. The new cause is prepended
   * to the chain so the returned `causes` array is ordered
   * newest-first.
   *
   * See `addNote` for the rationale on the return cast.
   */
  from(cause: Error | ErrorInstance): ErrorInstance<TFields> {
    const causeCauses = 'causes' in cause && Array.isArray(cause.causes) ? cause.causes : [];
    this.causes = [cause, ...causeCauses, ...this.causes];
    this.cause = cause;
    return this as unknown as ErrorInstance<TFields>;
  }
}

// ============================================================================
// Factory marker (used by is() for runtime discrimination)
// ============================================================================
//
/**
 * Symbol used by `is()` to discriminate factory-created errors at
 * runtime. Set on every instance via the class constructor; read by
 * `is/index.ts`.
 *
 * @internal
 */
const FACTORY_SYMBOL = Symbol.for('@deessejs/errors/factory');

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
  const { name, fields, inherits, message } = config;

  /**
   * Error factory function - creates error instances.
   */
  const ErrorFactoryInstance = (input?: Partial<T>): ErrorInstance<T> => {
    const fieldsData = (input || {}) as T;

    // Format message if template has placeholders
    let errorMessage = name;
    if (message && hasTemplatePlaceholders(message)) {
      errorMessage = formatTemplate(message, fieldsData);
    } else if (message) {
      errorMessage = message;
    }

    // Capture stack trace
    const stack = captureStack(errorMessage);

    // Construct the instance via the internal class. The class extends
    // Error (so `instance instanceof Error` is true) and sets the
    // brand marker in its constructor; no post-hoc assignment is
    // needed at the call site.
    const instance = new ErrorInstanceImpl<T>(
      name,
      errorMessage,
      stack,
      fieldsData,
      inherits
    ) as ErrorInstance<T>;

    // Attach the FACTORY_SYMBOL marker used by `is()` for runtime
    // discrimination. The cast is necessary because the class does
    // not declare a property keyed by this symbol (only the brand
    // is a class property; the factory marker is a runtime hook).
    (instance as unknown as Record<typeof FACTORY_SYMBOL, () => unknown>)[FACTORY_SYMBOL] =
      ErrorFactoryInstance;

    return instance;
  };

  // Attach metadata to the factory function
  Object.defineProperty(ErrorFactoryInstance, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  if (inherits !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).inherits = inherits;
  }

  if (fields !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).schema = fields;
  }

  if (message !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).rawMessage = message;
  }

  return ErrorFactoryInstance as ErrorFactory<T>;
};

// ============================================================================
// Exports for is() function
// ============================================================================

export { FACTORY_SYMBOL };
