// Snapshot tests for the textual outputs the site exposes to crawlers and
// LLM agents. Each test calls a Next.js route handler directly and snapshots
// the body. Volatile fields (sitemap `lastmod`) are normalised by the
// helpers, so a snapshot only changes when a fix intentionally changes the
// output.

import { describe, it, expect } from 'vitest';
import robotsRoute from '../../src/app/robots';
import sitemapRoute from '../../src/app/sitemap';
import { callRoute, normaliseSitemap } from './helpers';
// The route handlers live under directories whose name contains a dot
// (e.g. `llms.txt`). Importing them directly triggers a tsc TS5097 error
// because the project's tsconfig does not enable
// `allowImportingTsExtensions`. The shim in `fixtures/llms-routes.ts`
// re-exports them under plain identifiers and uses `require()` to bypass
// the dotted-path resolution problem.
import { llmsTxtGet, llmsFullTxtGet } from './fixtures/llms-routes';

describe('SEO snapshots', () => {
  it('robots.txt', async () => {
    const { body, status, contentType } = await callRoute(robotsRoute);
    expect(status).toBe(200);
    // Next.js does not set a specific content-type for the robots route; we
    // only assert there is a body.
    expect(body.length).toBeGreaterThan(0);
    expect(contentType).toBeTruthy();
    expect(body).toMatchSnapshot();
  });

  it('sitemap.xml (lastmod normalised)', async () => {
    const { body } = await callRoute(sitemapRoute);
    expect(body).toContain('<urlset');
    expect(body).toContain('https://errors.deessejs.com');
    expect(normaliseSitemap(body)).toMatchSnapshot();
  });

  it('llms.txt (first 4 KB + total length assertion)', async () => {
    // The shim wraps the GET handler into an async function returning a
    // Response, which is what `callRoute` expects.
    const { body } = await callRoute(() => llmsTxtGet());
    expect(body.length).toBeGreaterThan(100);
    // The first non-empty line must be the project heading so that any LLM
    // or agent reading the index immediately knows the parent entity.
    const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
    expect(firstLine).toMatch(/^# /);
    expect(body.slice(0, 4096)).toMatchSnapshot();
  });

  it('llms-full.txt (length assertion + head snapshot)', async () => {
    const { body } = await callRoute(() => llmsFullTxtGet());
    // We do not snapshot the whole body — it is concatenated Markdown across
    // every doc page, so a snapshot would churn on every doc edit. We assert
    // structure and snapshot the first 2 KB instead.
    expect(body.length).toBeGreaterThan(200);
    expect(body).toContain('# ');
    expect(body.slice(0, 2048)).toMatchSnapshot();
  });
});
