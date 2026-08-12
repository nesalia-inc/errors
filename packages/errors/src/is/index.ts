/**
 * Error type checking utilities.
 */

import type { ErrorFactory, ErrorInstance } from '../error/types.js';
import { FACTORY_SYMBOL } from '../error/internal/error-instance-impl.js';

/**
 * Type to extract the fields from an ErrorFactory or native Error class.
 *
 * @internal
 */
type ExtractFields<T> =
  T extends ErrorFactory<infer F>
    ? F
    : T extends new (...args: unknown[]) => infer E
      ? E extends ErrorInstance<infer F>
        ? F
        : Record<string, unknown>
      : Record<string, unknown>;

/**
 * Checks if an error is an instance of a specific error type.
 *
 * Works with:
 * - Custom error factories created by error()
 * - Single and multiple inheritance hierarchies
 * - Native JavaScript errors (TypeError, SyntaxError, etc.)
 *
 * @param error - The error to check (can be any value)
 * @param ErrorType - The error type to check against
 * @returns boolean - true if the error is the specified type or inherits from it
 *
 * @example
 * ```typescript
 * const AppError = error({ name: 'AppError' });
 * const ValidationError = error({ name: 'ValidationError', inherits: AppError });
 *
 * const err = ValidationError();
 * is(err, ValidationError); // true
 * is(err, AppError);        // true (through inheritance)
 * ```
 *
 * @example
 * ```typescript
 * // Works with native errors
 * try {
 *   JSON.parse('invalid');
 * } catch (err) {
 *   if (is(err, SyntaxError)) {
 *     // Handle syntax errors
 *   }
 * }
 * ```
 */
const is = <T extends ErrorFactory | (new (...args: unknown[]) => Error)>(
  error: unknown,
  ErrorType: T
): error is ErrorInstance<ExtractFields<T>> => {
  // Handle null/undefined
  if (error == null) {
    return false;
  }

  // Handle native errors - check prototype chain ends in Error
  if (typeof ErrorType === 'function' && 'prototype' in ErrorType) {
    try {
      if (error instanceof ErrorType) {
        return true;
      }
    } catch {
      // instanceof can fail for cross-realm errors
    }
  }

  // Handle our ErrorFactory instances using Symbol-based reference
  if (typeof error === 'object' && error !== null) {
    const marker = error as Record<typeof FACTORY_SYMBOL, unknown>;
    const factory = marker[FACTORY_SYMBOL];

    if (factory !== undefined) {
      // DFS walk of inheritance tree using stack (prevents GC pressure)
      const stack: ErrorFactory[] = [factory as ErrorFactory];
      const seen = new Set<ErrorFactory>();

      while (stack.length > 0) {
        const current = stack.pop()!;

        // Prevent infinite loops in cyclic inheritance
        if (seen.has(current)) {
          continue;
        }
        seen.add(current);

        // Direct match
        if (current === ErrorType) {
          return true;
        }

        // Add parents to stack
        const inherits = (current as ErrorFactory).inherits;
        if (inherits !== undefined) {
          if (Array.isArray(inherits)) {
            for (let i = 0; i < inherits.length; i++) {
              stack.push(inherits[i]);
            }
          } else {
            stack.push(inherits);
          }
        }
      }
    }
  }

  return false;
};

export { is };
