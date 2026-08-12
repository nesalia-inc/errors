/**
 * Internal error instance class.
 *
 * The class is **not exported**. Consumers see only the
 * `ErrorInstance<T>` type alias from `types.ts`, which is
 * structurally compatible with this class but does not expose
 * the constructor. The only way to mint an instance is `error()`
 * (or `ErrorFactoryImpl#create`), the factory function exported
 * from `error.ts`.
 *
 * @internal
 */

import type { ErrorFactory, ErrorInstance } from '../types.js';
import { ErrorInstanceBrand } from '../types.js';

// ============================================================================
// Internal symbols
// ============================================================================
//
// Declared before the class that uses them as property keys.

/**
 * Symbol used by `is()` to discriminate factory-created errors at
 * runtime. Declared as a class property on `ErrorInstanceImpl`; the
 * constructor assigns the factory function to this slot. Read by
 * `is/index.ts`.
 *
 * @internal
 */
export const FACTORY_SYMBOL = Symbol.for('@deessejs/errors/factory');

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
 */
export class ErrorInstanceImpl<TFields extends Record<string, unknown>> extends Error {
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
