/**
 * Internal factory class.
 *
 * The class is **not exported**. The factory function `error()`
 * returns a callable bound to the instance; consumers see only
 * the `ErrorFactory<T>` type alias from `types.ts`. Rule 0014
 * (functions over classes for public API) is satisfied because
 * the constructor is not exposed.
 *
 * @internal
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { ErrorFactory, ErrorInstance } from '../types.js';
import { hasTemplatePlaceholders, formatTemplate } from '../format.js';
import { captureStack } from '../capture.js';
import { ErrorInstanceImpl } from './error-instance-impl.js';

/**
 * Internal factory class. Owns the factory's metadata (`name`,
 * `inherits`, `schema`, `rawMessage`) and the `create` method that
 * mints `ErrorInstance` instances.
 */
export class ErrorFactoryImpl<TFields extends Record<string, unknown>> {
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
