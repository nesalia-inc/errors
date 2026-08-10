// Shared helpers for the SEO regression suite.
//
// The point of this file is to keep the test bodies tiny and the rendering
// shims in one place. Two render strategies are used:
//
//   1. `callRoute(defaultExport)` — for Next.js `route.ts` style handlers
//      (`robots.ts`, `sitemap.ts`, `llms.txt/route.ts`). Those files export a
//      plain function that Next turns into a Request handler; we just call
//      the function directly. Output may be a `Response` or a plain object
//      (`MetadataRoute.Sitemap` / `MetadataRoute.Robots`).
//
//   2. `renderServerComponent(Element)` — for `page.tsx` / `layout.tsx`
//      server components. We render with `react-dom/server`'s
//      `renderToString` and pretend it is the SSR output.
//
// We never start a real Next.js dev server. Vitest should run in well under
// a second for the entire suite.

import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';

/**
 * Invoke a Next.js route handler's default export and normalise the result
 * into a string body plus a status code.
 *
 * Next route handlers can return either a `Response`, a plain object (e.g.
 * `MetadataRoute.Sitemap`), or a string. We handle all three.
 */
export async function callRoute(
  defaultExport: unknown,
  request: Request = new Request('http://localhost:3000/')
): Promise<{ body: string; status: number; contentType: string }> {
  if (typeof defaultExport !== 'function') {
    throw new Error('callRoute: default export is not a function');
  }
  const result = await defaultExport(request);

  if (result instanceof Response) {
    return {
      body: await result.text(),
      status: result.status,
      contentType: result.headers.get('content-type') ?? '',
    };
  }

  if (typeof result === 'string') {
    return { body: result, status: 200, contentType: 'text/plain' };
  }

  // Detect Next `MetadataRoute.Sitemap`: an array of `{ url, ... }`.
  if (
    Array.isArray(result) &&
    result.length > 0 &&
    result[0] &&
    typeof result[0] === 'object' &&
    'url' in result[0]
  ) {
    return { body: renderSitemapXml(result), status: 200, contentType: 'application/xml' };
  }

  // Detect Next `MetadataRoute.Robots`: `{ rules, sitemap, host }`.
  if (result && typeof result === 'object' && 'rules' in (result as Record<string, unknown>)) {
    return {
      body: renderRobotsTxt(result as RobotsObject),
      status: 200,
      contentType: 'text/plain',
    };
  }

  // Plain object — JSON serialise.
  return {
    body: JSON.stringify(result),
    status: 200,
    contentType: 'application/json',
  };
}

interface SitemapEntry {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: string;
  priority?: number;
  images?: string[];
}

function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod =
        e.lastModified instanceof Date ? e.lastModified.toISOString() : (e.lastModified ?? '');
      const changefreq = e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : '';
      const priority = e.priority !== undefined ? `<priority>${e.priority}</priority>` : '';
      const images = (e.images ?? [])
        .map((u) => `<image:image><image:loc>${u}</image:loc></image:image>`)
        .join('');
      const xhtml = images ? ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` : '';
      return `  <url>
    <loc>${e.url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    ${changefreq}${priority}${images ? `\n    ${images}` : ''}
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${urls ? '' : ''}>${urls ? '\n' + urls : ''}
</urlset>`;
}

interface RobotsObject {
  rules: Array<{
    userAgent?: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }>;
  sitemap?: string | string[];
  host?: string;
}

function renderRobotsTxt(robots: RobotsObject): string {
  const lines: string[] = [];
  for (const rule of robots.rules) {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent ?? '*'];
    for (const agent of agents) {
      lines.push(`User-agent: ${agent}`);
      const allow = Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : [];
      for (const path of allow) lines.push(`Allow: ${path}`);
      const disallow = Array.isArray(rule.disallow)
        ? rule.disallow
        : rule.disallow
          ? [rule.disallow]
          : [];
      for (const path of disallow) lines.push(`Disallow: ${path}`);
    }
  }
  if (robots.sitemap) {
    const maps = Array.isArray(robots.sitemap) ? robots.sitemap : [robots.sitemap];
    for (const m of maps) lines.push(`Sitemap: ${m}`);
  }
  if (robots.host) lines.push(`Host: ${robots.host}`);
  return lines.join('\n') + '\n';
}

/** Render a server component to its HTML string. */
export function renderServerComponent(element: ReactElement): string {
  return renderToString(element);
}

/**
 * Extract every JSON-LD block from an HTML document. The root layout
 * serialises blocks with a `<` → `<` escape to prevent injection; we
 * un-escape before parsing.
 */
export function extractJsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].replace(/\\u003c/g, '<').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (Array.isArray(parsed)) {
      for (const block of parsed) {
        if (block && typeof block === 'object') blocks.push(block as Record<string, unknown>);
      }
    } else if (parsed && typeof parsed === 'object') {
      blocks.push(parsed as Record<string, unknown>);
    }
  }
  return blocks;
}

/**
 * Normalise volatile fields in a sitemap XML body so the snapshot is stable
 * across builds. Replaces every `<lastmod>...</lastmod>` value with a
 * placeholder.
 */
export function normaliseSitemap(body: string): string {
  return body.replace(/<lastmod>[^<]+<\/lastmod>/g, '<lastmod>__SNAPSHOT__</lastmod>');
}
