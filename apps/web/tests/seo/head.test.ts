// Tests for the root layout's `<head>` structure. The SEO audit
// identified several `<link>` and `<meta>` tags that must be present for
// crawlers and AI agents to discover every site surface:
//   - sitemap reference
//   - RSS feed reference
//   - google-site-verification
//   - JSON-LD scripts
//   - favicon (added by #64)
// We assert on each one so a regression is caught at the SEO layer
// without needing a full Next.js build.

import { describe, it, expect } from 'vitest';
import { renderServerComponent, extractJsonLdBlocks } from './helpers';
import { JsonLd, HeadLinks } from '../../src/app/layout.tsx';

describe('root layout <head>', () => {
  describe('HeadLinks', () => {
    it('emits a <link rel="sitemap"> tag pointing at /sitemap.xml', () => {
      const html = renderServerComponent(HeadLinks());
      expect(html).toMatch(/<link[^>]+rel=["']sitemap["'][^>]+href=["']\/sitemap\.xml["']/);
    });

    it('emits an RSS feed <link rel="alternate" type="application/rss+xml"> tag', () => {
      const html = renderServerComponent(HeadLinks());
      expect(html).toMatch(
        /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/rss\+xml["'][^>]+href=["']\/blog\/rss\.xml["']/
      );
    });

    it('emits a <meta name="google-site-verification"> tag', () => {
      const html = renderServerComponent(HeadLinks());
      expect(html).toMatch(/<meta[^>]+name=["']google-site-verification["'][^>]+content=/);
    });

    it.todo('emits a <link rel="icon"> tag pointing at /favicon.ico (#64)');

    it.todo('emits an <link rel="apple-touch-icon"> tag (#64)');
  });

  describe('JsonLd', () => {
    it('emits a JSON-LD script block with at least one Organization entity', () => {
      const html = renderServerComponent(JsonLd());
      const blocks = extractJsonLdBlocks(html);
      const orgs = blocks.filter((b) => b['@type'] === 'Organization');
      expect(orgs.length).toBeGreaterThan(0);
    });

    it.todo('root Organization is DeesseJS with parentOrganization=Nesalia Inc (pending #65)');
    it.todo('SoftwareApplication.publisher is DeesseJS (pending #65)');
    it.todo('SoftwareApplication.operatingSystem matches engines.node (pending #63)');
  });
});
