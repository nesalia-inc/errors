/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Schema inference
// ============================================================================

/**
 * Extracts the field shape from a Standard Schema, defaulting to
 * `Record<string, never>` when no schema is provided.
 *
 * When `S extends StandardSchemaV1`, the output type of the schema is
 * used as the field shape. When `S` is `undefined` (the default for
 * schemas that are not passed to `error()`), an empty record is used.
 *
 * The `[S] extends [StandardSchemaV1]` form is used (instead of the
 * naked conditional) to avoid distributing over union types and to
 * ensure the `undefined` branch is matched as a whole.
 *
 * @internal
 */
export type InferFields<S> = [S] extends [StandardSchemaV1]
  ? StandardSchemaV1.InferOutput<S> & Record<string, unknown>
  : Record<string, never>;

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
  };

/**
 * Full error config for the error() function.
 *
 * Mirrors the public `error()` signature for callers that want to
 * type a config object separately. The `fields` parameter accepts
 * any Standard Schema-compliant validator; the field shape is
 * inferred from the schema's output type.
 */
export type ErrorConfig<S extends StandardSchemaV1 | undefined = undefined> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions */
  fields?: S;
  /** Single parent error factory to inherit from */
  inherits?: ErrorFactory | ErrorFactory[];
  /** Message template with {field} placeholders */
  message?: string;
};
