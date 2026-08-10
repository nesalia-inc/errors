// Test fixtures for the SEO regression suite.
//
// We re-export the JSON-LD component from the production layout so the test
// fixtures render exactly what the site renders. If a PR changes the JSON-LD
// shape, the tests fail in the same PR — no drift between fixtures and prod.
//
// Note: we import the component directly without going through the barrel of
// `src/app/layout`, which also wires up `next/font` and the Vercel Analytics
// client — neither of which work in a Vitest + happy-dom environment.

export { JsonLd as layoutJsonLdScript } from '../../../src/app/layout';
// `JsonLd` is a named export of the layout module but is not re-exported
// from its default; import it directly via the module path that lives in
// the same file as `JsonLd`. The production layout re-exports it for us.
// (See apps/web/src/app/layout.tsx: `export { JsonLd }`.)
//
// The re-export below is a type-level hint for IDEs only — the real import
// resolves through the named export added in the layout.
import { JsonLd } from '../../../src/app/layout';
export { JsonLd };
