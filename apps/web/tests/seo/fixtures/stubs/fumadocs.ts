// Minimal stub for `fumadocs-core/source` so `src/lib/source.ts` can be
// imported inside Vitest without booting the full Fumadocs loader.
//
// The SEO tests only need `source.getPages()` (to enumerate URLs for the
// sitemap and `llms.txt`) and `source.getPageTree()` (for the layout). We
// expose those via a tiny helper that the fixtures drive.

interface PageEntry {
  info: { path: string; fullPath: string };
  data: Record<string, unknown>;
}

interface LoaderConfig {
  baseUrl: string;
  source: { files?: Array<{ type: 'page' | 'meta'; data: PageEntry }> };
  plugins?: unknown[];
}

interface Page {
  url: string;
  slugs: string[];
  path: string;
  data: Record<string, unknown> & { getText: (mode: string) => Promise<string> };
}

export function loader(config: LoaderConfig) {
  const baseUrl = config.baseUrl;
  const pages: Page[] = (config.source.files ?? [])
    .filter((f) => f.type === 'page')
    .map((f) => {
      const slugs = f.data.info.path
        .replace(/\.mdx?$/, '')
        .split('/')
        .filter(Boolean);
      const url = baseUrl + '/' + slugs.join('/');
      const data = f.data.data as Record<string, unknown> & { _markdown?: string };
      return {
        url,
        slugs,
        path: f.data.info.path,
        data: {
          ...data,
          getText: async (_mode: string) => data._markdown ?? '',
        },
      };
    });

  return {
    getPages: () => pages,
    getPage: (slugs: string[] | undefined) => {
      const wanted = '/' + (slugs ?? []).join('/');
      return pages.find((p) => p.url === baseUrl + wanted) ?? null;
    },
    getPageTree: () => ({ children: [] }),
    params: { slug: undefined as string[] | undefined },
    generateParams: () => pages.map((p) => ({ slug: p.slugs })),
    $inferPage: {} as Page,
  };
}

export function toFumadocsSource(pages: PageEntry[] | { docs?: PageEntry[] }) {
  // Fumadocs' runtime helper accepts either an array of page entries or an
  // object exposing a `.docs` array. We normalise both shapes here so the
  // tests can pass either.
  const arr = Array.isArray(pages) ? pages : (pages?.docs ?? []);
  return {
    files: arr.map((e) => ({ type: 'page' as const, data: e })),
  };
}

export const lucideIconsPlugin = () => ({
  name: 'lucide-icons-stub',
});

// `llms(source)` is a Fumadocs helper that returns `{ index, full }`. We
// re-implement it minimally so the `llms.txt` / `llms-full.txt` route
// handlers can run inside Vitest without the real Fumadocs.
export function llms(source: {
  getPages: () => Array<{
    url: string;
    data: Record<string, unknown> & { getText?: (m: string) => Promise<string> };
  }>;
}) {
  return {
    index: () => {
      const pages = source.getPages();
      const lines = pages.map((p) => {
        const title = String((p.data as Record<string, unknown>).title ?? p.url);
        return `- [${title}](${p.url})`;
      });
      return `# Index\n\n${lines.join('\n')}\n`;
    },
    full: async () => {
      const pages = source.getPages();
      const out: string[] = [];
      for (const p of pages) {
        const title = String((p.data as Record<string, unknown>).title ?? p.url);
        const text = p.data.getText ? await p.data.getText('processed') : '';
        out.push(`# ${title} (${p.url})\n\n${text}`);
      }
      return out.join('\n\n');
    },
  };
}
