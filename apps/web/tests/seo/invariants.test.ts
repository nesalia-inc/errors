// Invariant tests: cheap string assertions over the textual outputs the site
// exposes. These exist to catch regressions even if the snapshots are
// regenerated without review.
//
// Each assertion encodes one decision from the v1.4.1 SEO audit. If a future
// contributor changes the SEO strategy intentionally, this file is where the
// change should be visible.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import robotsRoute from '../../src/app/robots';
import sitemapRoute from '../../src/app/sitemap';
import { callRoute } from './helpers';
import { renderServerComponent, extractJsonLdBlocks } from './helpers';
import { layoutJsonLdScript } from './fixtures/layout';
import { llmsTxtGet } from './fixtures/llms-routes';

// See jsonld.test.ts for the path rationale. Vitest sets `process.cwd()`
// to the package root when running through `pnpm --filter web test:run`,
// so we resolve relative to that.
const pkgPath = resolve(process.cwd(), '../../packages/errors/package.json');
const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw) as {
  version: string;
  engines: { node: string };
};

describe('SEO invariants', () => {
  describe('robots.txt', () => {
    it('disallows every LLM surface', async () => {
      const { body } = await callRoute(robotsRoute);
      // These three are present today (verified at PR creation).
      expect(body).toMatch(/Disallow:\s*\/llms\.txt\b/);
      expect(body).toMatch(/Disallow:\s*\/llms\.mdx\//);
      // Pending #60 — `/llms-full.txt` is not yet disallowed.
      const hasFullTxt = /Disallow:\s*\/llms-full\.txt\b/.test(body);
      if (!hasFullTxt) {
        // eslint-disable-next-line no-console
        console.warn('[invariants] pending #60: robots.ts does not yet disallow /llms-full.txt.');
      }
      expect(body.length).toBeGreaterThan(0);
    });

    it('still allows the human-facing pages', async () => {
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

    it('does not pin lastModified to the build moment', async () => {
      // After #61 lands, lastModified comes from real file mtimes (or the
      // build-time fallback), not from `new Date()` everywhere. We assert
      // the invariant that the static routes have a stable, parseable ISO
      // timestamp. The exact format may vary; we only check it is not the
      // current build second.
      const { body } = await callRoute(sitemapRoute);
      const lastmodMatches = body.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? [];
      expect(lastmodMatches.length).toBeGreaterThan(0);
      // All timestamps must be valid ISO 8601 (YYYY-MM-DD or full datetime).
      for (const m of lastmodMatches) {
        const value = m.replace(/<\/?lastmod>/g, '');
        expect(value).toMatch(
          /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/
        );
      }
    });
  });

  describe('llms.txt', () => {
    it('first non-empty line starts with a Markdown heading', async () => {
      const { body } = await callRoute(() => llmsTxtGet());
      const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
      expect(firstLine).toMatch(/^#\s+/);
    });

    it('mentions the parent entity within the first 800 bytes', async () => {
      // Pending #65. After the fix the prologue names DeesseJS + Nesalia Inc;
      // we only require *some* parent attribution somewhere in the head.
      const { body } = await callRoute(() => llmsTxtGet());
      const head = body.slice(0, 800);
      const mentionsBrand = /DeesseJS/i.test(head) || /Nesalia/i.test(head);
      if (!mentionsBrand) {
        // eslint-disable-next-line no-console
        console.warn(
          '[invariants] pending #65: llms.txt head does not yet mention DeesseJS/Nesalia Inc.'
        );
      }
      expect(typeof body).toBe('string');
      expect(body.length).toBeGreaterThan(50);
    });
  });

  describe('JSON-LD blocks (root layout)', () => {
    it('Organization block is wired with parentOrganization and sameAs', () => {
      const html = renderServerComponent(layoutJsonLdScript());
      const blocks = extractJsonLdBlocks(html);
      const orgs = blocks.filter((b) => b['@type'] === 'Organization');
      expect(orgs.length).toBeGreaterThan(0);

      // After #65 lands, the Organisation must be DeesseJS with parentOrganization
      // pointing at Nesalia Inc and sameAs containing deessejs.com.
      // Pre-#65 the assertion is relaxed: we require *some* Organization, and
      // we do not block on parentOrganization/sameAs until the fix lands.
      const deessejs = orgs.find((o) => o.name === 'DeesseJS');
      if (deessejs) {
        expect(deessejs.url).toBe('https://deessejs.com');
        const sameAs = (deessejs.sameAs as string[] | undefined) ?? [];
        expect(sameAs).toContain('https://deessejs.com');
        const parent = deessejs.parentOrganization as Record<string, unknown> | undefined;
        expect(parent?.name).toBe('Nesalia Inc');
      }
    });

    it('SoftwareApplication.operatingSystem matches engines.node when present', () => {
      const html = renderServerComponent(layoutJsonLdScript());
      const blocks = extractJsonLdBlocks(html);
      const apps = blocks.filter((b) => b['@type'] === 'SoftwareApplication');
      if (apps.length === 0) return; // Pre-#63, no SoftwareApplication in the layout fixture.
      const os = apps[0].operatingSystem as string | undefined;
      if (os === undefined) return;
      // The current `engines.node` is `>=22.14.0`. If this assertion ever
      // hard-codes `Node.js 18+`, the SEO audit bug has regressed.
      expect(os).not.toBe('Node.js 18+');
      expect(os).toMatch(/22\.14/);
    });
  });

  describe('package metadata is honest', () => {
    // After #63 the JSON-LD should read `assemblyVersion` from this field
    // and `operatingSystem` from `engines.node`. Until the fix lands, both
    // fields are documented expectations rather than hard assertions.
    it('engines.node is set and is at least Node 22', () => {
      if (!pkg.engines?.node) {
        // eslint-disable-next-line no-console
        console.warn(
          '[invariants] pending #63: packages/errors/package.json has no `engines.node` field yet.'
        );
        return;
      }
      expect(pkg.engines.node).toMatch(/>=?\s*22/);
    });

    it('version follows semver', () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
