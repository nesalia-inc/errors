/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Public API exports for the error handling library.
 */

// Types
export type { StandardSchemaV1 } from '@standard-schema/spec';
export type {
  ErrorFactory,
  ErrorFactoryConfig,
  ErrorInstance,
  ErrorInstanceCore,
} from './error/types.js';

// Error factory function
export { error } from './error/error.js';

// Error raising function
export { raise } from './raise/index.js';

// Error type checking function
export { is } from './is/index.js';

// Cause chain traversal function
export { causes } from './causes/index.js';
