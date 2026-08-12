/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { ErrorFactory, ErrorInstance } from './types.js';
import { ErrorInstanceBrand } from './types.js';
import { captureStack } from './capture.js';
import { formatTemplate, hasTemplatePlaceholders } from './format.js';

// ============================================================================
// Symbols for identity
// ============================================================================

/**
 * Symbol used to identify factory-created errors.
 * Stored on the error instance to enable reliable instanceof checks.
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

    // Create error instance using native Error
    const instance = new Error(errorMessage) as ErrorInstance<T>;
    instance.name = name;
    instance.fields = fieldsData;
    instance.notes = [];
    instance.cause = null;
    instance.causes = [];
    instance.context = null;
    instance.inherits = inherits ?? undefined;
    // Brand marker — only this code path can set it. The brand is
    // what makes ErrorInstance<T> distinguishable from a duck-typed
    // object at the type level (see ErrorInstanceBrand in types.ts).
    // The cast drops the `readonly` modifier locally so the assignment
    // compiles; the runtime invariant (only `error()` sets the brand)
    // is enforced by the fact that the brand property is declared
    // `readonly` on the type, so consumer code cannot assign it
    // without an `as` escape hatch.
    (instance as { [ErrorInstanceBrand]: 'ErrorInstance' })[ErrorInstanceBrand] = 'ErrorInstance';
    instance.stack = stack;

    // Add .from() method for exception chaining
    instance.from = (cause: Error): ErrorInstance<T> => {
      // Build new causes array: [new cause] + [cause's causes] + [existing causes of instance]
      // This maintains chronological order: newest first
      const causeCauses = 'causes' in cause && Array.isArray(cause.causes) ? cause.causes : [];
      instance.causes = [cause, ...causeCauses, ...instance.causes];
      instance.cause = cause;
      return instance;
    };

    // Add .addNote() method for runtime context (PEP 678)
    instance.addNote = (note: string): ErrorInstance<T> => {
      instance.notes.push(note);
      return instance;
    };

    // Mark this instance as created by this factory (for is() checks)
    // Use callable to avoid generic parameter conflicts
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
