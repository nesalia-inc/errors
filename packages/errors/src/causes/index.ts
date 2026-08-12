/**
 * Cause chain traversal utilities.
 */

/**
 * Returns all causes in the error chain, from most recent to root cause.
 *
 * The function uses a structural guard (`'causes' in error && Array.isArray(error.causes)`)
 * rather than a type cast. This is rule 0004 in operational form: the
 * guard is named, the scenario it covers is named, and the input can be
 * `unknown` without an `as ErrorInstance` cast at the call site.
 *
 * @param error - The error to get causes from (any value; `null` and
 * `undefined` return `[]`)
 * @returns Array of errors in the cause chain, ordered newest to
 * oldest. Returns `[]` when the input does not carry a `causes` array.
 *
 * @example
 * ```typescript
 * import { causes, raise } from '@deessejs/errors';
 *
 * try {
 *   await sync();
 * } catch (err) {
 *   causes(err).forEach((cause) => logError(cause));
 * }
 * ```
 *
 * @example
 * ```typescript
 * const err = ValidationError({ field: 'email' })
 *   .from(new NetworkError('Connection failed'))
 *   .from(new Error('DNS lookup failed'));
 *
 * // causes(err) returns newest-to-oldest: [NetworkError, Error]
 * // (err.cause is NetworkError, err.cause.cause is Error)
 * ```
 */
const causes = (error: unknown): Error[] => {
  if (error == null) {
    return [];
  }

  if (typeof error !== 'object') {
    return [];
  }

  if (!('causes' in error) || !Array.isArray(error.causes)) {
    return [];
  }

  return error.causes;
};

export { causes };
