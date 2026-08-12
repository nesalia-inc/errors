/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Brand
// ============================================================================

/**
 * Internal brand symbol. Set in the constructor of `ErrorInstanceImpl`
 * (issue #88); the only assignment site in the codebase.
 *
 * Exposed here so `ErrorInstanceImpl` (declared in `error.ts`) can
 * reference it as a property key. Consumers cannot mint a branded
 * instance because the symbol is not exported from the package root
 * `index.ts`.
 *
 * @internal
 */
export const ErrorInstanceBrand: unique symbol = Symbol('@deessejs/errors/brand');

/**
 * Schema inference helper. Extracts the field shape from a Standard
 * Schema, defaulting to `Record<string, never>` when no schema is
 * provided. Used at the call site to derive the error's generic.
 *
 * The intersection with `Record<string, unknown>` widens the spec's
 * `InferOutput<S>` (which can resolve to `never` for schemas that
 * omit `types`) into a usable record at the `ErrorFactory<TFields>`
 * boundary; see the comment in the README and the changelog for
 * the rationale.
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
 *
 * Mirrors the runtime shape set by `ErrorInstanceImpl`'s constructor.
 * These are the inherited `Error` fields narrowed to required strings.
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
 *
 * The implementation is a private class (`ErrorInstanceImpl`) declared
 * in `error.ts` (issue #88). The brand marker is a class property set
 * in the constructor; consumer code cannot mint a branded instance.
 *
 * The class extends `Error` at runtime, so `instance instanceof Error`
 * is `true`; this type does not declare an `extends Error` relationship
 * because doing so would force `name`/`message`/`stack` to be
 * optional (matching the inherited `Error` shape) and weaken the
 * runtime invariant. The factory function bridges the gap via a
 * cast at the construction site.
 */
export type ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>> =
  ErrorInstanceCore & {
    /** Brand marker. Set in the class constructor; the only assignment site. */
    readonly [ErrorInstanceBrand]: 'ErrorInstance';
    /** User-defined fields from Standard Schema */
    fields: TFields;
    /** Additional notes added via .addNote() */
    notes: string[];
    /**
     * Adds a note to this error instance.
     *
     * Patterned after Python 3.11's `BaseException.add_note()` (PEP 678).
     */
    addNote(note: string): ErrorInstance<TFields>;
    /**
     * Chains a cause error to this error.
     */
    from(cause: Error | ErrorInstance): ErrorInstance<TFields>;
    /** Direct cause of this error (from .from()) */
    cause: Error | null;
    /** Full cause chain from .from() calls */
    causes: Error[];
    /** Injected context data */
    context: Record<string, unknown> | null;
    /** Parent error factories for type checking */
    inherits?: ErrorFactory | ErrorFactory[];
  };

/**
 * Configuration accepted by the `error()` factory.
 *
 * The `S` generic is the Standard Schema type (when one is provided
 * via `fields`). It is unbounded by default — most callers do not
 * pass a schema and get the empty-record default. Callers that do
 * pass a schema can rely on TS to infer the field shape downstream.
 *
 * Named here (rather than inlined at the call signature) so the
 * `error()` declaration reads as a single line and the config shape
 * is independently typeable for callers who want to compose
 * configurations programmatically.
 */
export type ErrorFactoryConfig<S extends StandardSchemaV1 | undefined = undefined> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions */
  fields?: S;
  /** Single parent error factory, or list of parents, to inherit from */
  inherits?: ErrorFactory | ErrorFactory[];
  /** Message template with {field} placeholders */
  message?: string;
};
