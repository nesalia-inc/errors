// Invariant tests: cheap string assertions over the textual and
// structured-data outputs the site exposes. Each invariant encodes one
// decision from the v1.4.1 SEO audit; if a future contributor changes
// the SEO strategy intentionally, this file is where the change should
// be visible.
//
// We deliberately keep `it.todo()` markers for invariants that are not
// yet satisfied (pending a tracked issue). `it.todo()` is a first-class
// Vitest primitive: it shows up in the report as a known gap rather than
// silently passing because of a soft assertion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import robotsRoute from '../../src/app/robots';
import sitemapRoute from '../../src/app/sitemap';
import * as llmsTxtRoute from '../../src/app/llms.txt/route.ts';
import * as llmsFullTxtRoute from '../../src/app/llms-full.txt/route.ts';
import { callRoute, renderServerComponent, extractJsonLdBlocks } from './helpers';
import { JsonLd as layoutJsonLdScript } from '../../src/app/layout.tsx';

// Read the package version once at module load. `process.cwd()` is the
// package root when running through `pnpm --filter web test:run`.
const pkgPath = resolve(process.cwd(), '../../packages/errors/package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
  version: string;
  engines: { node?: string };
};

describe('SEO invariants', () => {
  describe('robots.txt', () => {
    it('disallows every LLM surface', async () => {
      const { body } = await callRoute(robotsRoute);
      // The three LLM endpoints the SEO audit flagged. Hard assertions:
      // these are true today and must stay true.
      expect(body).toMatch(/Disallow:\s*\/llms\.txt\b/);
      expect(body).toMatch(/Disallow:\s*\/llms\.mdx\//);
    });

    it.todo('disallows /llms-full.txt (#60) — replace with hard assertion after the fix lands');

    it('allows the human-facing pages', async () => {
      const { body } = await callRoute(robotsRoute);
      expect(body).toMatch(/Allow:\s*\//);
    });

    it('points crawlers to the sitemap', async () => {
      const { body } = await callRoute(robotsRoute);
      expect(body).toMatch(/Sitemap:\s*https:\/\/errors\.deessejs\.com\/sitemap\.xml/);
    });
  });

  describe('sitemap.xml', () => {
    it('contains the canonical home URL', async () => {
      const { body } = await callRoute(sitemapRoute);
      expect(body).toContain('https://errors.deessejs.com');
    });

    it('emits parseable ISO 8601 lastmod timestamps', async () => {
      const { body } = await callRoute(sitemapRoute);
      const lastmodMatches = body.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? [];
      expect(lastmodMatches.length).toBeGreaterThan(0);
      for (const m of lastmodMatches) {
        const value = m.replace(/<\/?lastmod>/g, '');
        expect(value).toMatch(
          /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/
        );
      }
    });

    it.todo(
      'does not emit the build second as lastModified for static routes (#61) — assert two consecutive sitemap bodies are byte-identical after the fix lands'
    );
  });

  describe('llms.txt', () => {
    it('first non-empty line is a Markdown heading', async () => {
      const { body } = await callRoute(llmsTxtRoute.GET);
      const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
      expect(firstLine).toMatch(/^#\s+/);
    });

    it.todo('llms.txt mentions the parent entity within the first 800 bytes (pending #65)');

    it('llms-full.txt body is non-trivial Markdown', async () => {
      const { body } = await callRoute(llmsFullTxtRoute.GET);
      expect(body.length).toBeGreaterThan(200);
      expect(body).toContain('# ');
    });
  });

  describe('JSON-LD blocks (root layout)', () => {
    it('emits at least one Organization block', () => {
      const html = renderServerComponent(layoutJsonLdScript());
      const orgs = extractJsonLdBlocks(html).filter((b) => b['@type'] === 'Organization');
      expect(orgs.length).toBeGreaterThan(0);
    });

    it.todo(
      'Organization is DeesseJS with parentOrganization=Nesalia Inc and sameAs contains deessejs.com (pending #65)'
    );

    it.todo('SoftwareApplication.operatingSystem matches engines.node (pending #63)');
  });

  describe('package metadata is honest', () => {
    it('version follows semver', () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it.todo('engines.node is set and is at least Node 22 (pending #63)');
  });
});
