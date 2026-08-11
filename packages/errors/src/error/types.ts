/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Internal markers
// ============================================================================

/**
 * Symbol used to identify factory-created errors.
 * Stored on the error instance to enable reliable instanceof checks.
 *
 * The symbol is shared across the package (registered in the global
 * Symbol registry) so that two copies of the package — or two
 * realms — agree on the marker. The runtime check in `is()` is
 * keyed by this symbol.
 *
 * @internal
 */
export const FACTORY_SYMBOL: unique symbol = Symbol.for('@deessejs/errors/factory');

// ============================================================================
// Types
// ============================================================================

/**
 * Core properties present on every error instance.
 * These are guaranteed to exist regardless of how the error was created.
 */
export type ErrorInstanceCore = {
  /** Error name identifier */
  name: string;
  /** Human-readable error message */
  message: string;
  /** Stack trace string */
  stack: string;
};

/**
 * Error factory function type.
 * Creates typed, structured errors with optional field definitions.
 */
export type ErrorFactory<TFields extends Record<string, unknown> = Record<string, never>> = {
  (fields?: Partial<TFields>): ErrorInstance<TFields>;
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  schema?: StandardSchemaV1;
  rawMessage?: string;
};

/**
 * Error instance returned by an ErrorFactory.
 * Contains all standard Error properties plus additional domain-specific fields.
 */
export type ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>> =
  ErrorInstanceCore & {
    /** User-defined fields from Standard Schema */
    fields: TFields;
    /** Additional notes added via .addNote() */
    notes: string[];
    /**
     * Adds a note to this error instance.
     *
     * Notes provide runtime context that complements the structured fields.
     * Patterned after Python 3.11's `BaseException.add_note()` (PEP 678).
     *
     * @param note - The note text to attach
     * @returns This error instance for chaining
     *
     * @example
     * ```typescript
     * const err = AppError().addNote('Attempt 1 failed').addNote('Retrying...');
     * // err.notes === ['Attempt 1 failed', 'Retrying...']
     * ```
     */
    addNote(note: string): ErrorInstance<TFields>;
    /**
     * Chains a cause error to this error.
     *
     * @param cause - The error that caused this one
     * @returns This error instance for chaining
     *
     * @example
     * ```typescript
     * const err = ValidationError({ field: 'email' })
     *   .from(new NetworkError('Connection failed'));
     * ```
     */
    from(cause: Error | ErrorInstance): ErrorInstance<TFields>;
    /** Direct cause of this error (from .from()) */
    cause: Error | null;
    /** Full cause chain from .from() calls */
    causes: Error[];
    // TODO: Implement context injection (Task 10)
    /** Injected context data */
    context: Record<string, unknown> | null;
    /** Parent error factories for type checking */
    inherits?: ErrorFactory | ErrorFactory[];
    /**
     * Marker pointing back to the factory that produced this instance.
     * Set by `error()` at construction time; read by `is()` to
     * discriminate factory-created errors.
     *
     * @internal
     */
    [FACTORY_SYMBOL]: ErrorFactory<TFields>;
  };

/**
 * Full error config for the error() function.
 *
 * @internal - Type parameter reserved for future Standard Schema type inference
 */
export type ErrorConfig<_T extends Record<string, unknown> = Record<string, unknown>> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions */
  fields?: StandardSchemaV1;
  /** Single parent error factory to inherit from */
  inherits?: ErrorFactory | ErrorFactory[];
  /** Message template with {field} placeholders */
  message?: string;
};
