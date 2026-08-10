// Snapshot tests for the textual outputs the site exposes to crawlers and
// LLM agents. Each test calls a Next.js route handler directly and snapshots
// the body. Volatile fields (sitemap `lastmod`) are normalised by the
// helpers, so a snapshot only changes when a fix intentionally changes the
// output.
//
// We import the production route handlers with explicit `.ts` extensions.
// `tsconfig.test.json` enables `allowImportingTsExtensions` for tests only,
// so tsc accepts the dotted directories (`llms.txt/`, `llms-full.txt/`)
// without the production tsconfig being polluted.

import { describe, it, expect } from 'vitest';
import robotsRoute from '../../src/app/robots';
import sitemapRoute from '../../src/app/sitemap';
import * as llmsTxtRoute from '../../src/app/llms.txt/route.ts';
import * as llmsFullTxtRoute from '../../src/app/llms-full.txt/route.ts';
import { callRoute, normaliseSitemap } from './helpers';

describe('SEO snapshots', () => {
  it('robots.txt', async () => {
    const { body, status, contentType } = await callRoute(robotsRoute);
    expect(status).toBe(200);
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
    const { body } = await callRoute(llmsTxtRoute.GET);
    expect(body.length).toBeGreaterThan(100);
    // The first non-empty line must be a Markdown heading so LLM agents
    // reading the index immediately know what the project is.
    const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
    expect(firstLine).toMatch(/^# /);
    expect(body.slice(0, 4096)).toMatchSnapshot();
  });

  it('llms-full.txt (length assertion + head snapshot)', async () => {
    const { body } = await callRoute(llmsFullTxtRoute.GET);
    // We do not snapshot the whole body — it is concatenated Markdown across
    // every doc page, so a snapshot would churn on every doc edit. We assert
    // structure and snapshot the first 2 KB instead.
    expect(body.length).toBeGreaterThan(200);
    expect(body).toContain('# ');
    expect(body.slice(0, 2048)).toMatchSnapshot();
  });
});
