// Re-export shim for the llms.txt route handlers.
//
// Why this file exists: the production route handlers live at
//   - apps/web/src/app/llms.txt/route.ts
//   - apps/web/src/app/llms-full.txt/route.ts
// Their directory names contain a dot, which Vite's resolver
// misinterprets as a file extension when used in a relative import.
//
// We expose them under plain aliases (`~llms-txt-route` and
// `~llms-full-txt-route`) that are resolved at both compile-time (via
// `tsconfig.json` `paths`) and runtime (via `vitest.config.ts` aliases).

import * as llmsTxtRoute from '~llms-txt-route';
import * as llmsFullTxtRoute from '~llms-full-txt-route';

type Get = () => Promise<Response> | Response;

// The production handlers return `Promise<Response>` because Next.js's
// typed routes treat GET handlers as async; we await either way to be
// robust against future changes.
export const llmsTxtGet = async (): Promise<Response> => {
  return Promise.resolve((llmsTxtRoute as unknown as { GET: Get }).GET());
};

export const llmsFullTxtGet = async (): Promise<Response> => {
  return Promise.resolve((llmsFullTxtRoute as unknown as { GET: Get }).GET());
};
