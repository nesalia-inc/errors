// Stub for the `collections/server` virtual module produced by
// `fumadocs-mdx` at build time.
//
// The SEO tests do not need real MDX parsing. We expose the collections as
// arrays of plain page entries with `info: { path, fullPath }` and the data
// attached. The shape is loose enough to satisfy both consumption paths in
// `apps/web/src/lib/source.ts`:
//
//   1. `loader({ source: docs.toFumadocsSource() })` (instance method,
//      called by `loader()` to enumerate pages)
//   2. `toFumadocsSource(blog, [])` (runtime helper, also iterating entries)
//
// We additionally re-export `docs_collection` and `blog_collection` as
// collections whose `toFumadocsSource()` instance method produces the
// `{ files: [...] }` shape our `loader()` stub expects.

interface PageMeta {
  title: string;
  description?: string;
  date?: string;
  author?: string;
}

interface PageEntry {
  info: { path: string; fullPath: string };
  data: PageMeta & { _markdown?: string };
}

interface CollectionShape {
  docs: PageEntry[];
  meta: PageEntry[];
  toFumadocsSource: (options?: { baseDir?: string }) => {
    files: Array<{ type: 'page' | 'meta'; path: string; absolutePath: string; data: PageEntry }>;
  };
}

function makeCollection(pages: Array<{ path: string; data: PageMeta }>): CollectionShape {
  const entries: PageEntry[] = pages.map((p) => ({
    info: {
      path: p.path,
      fullPath: `/fake/content/${p.path}`,
    },
    data: {
      ...p.data,
      _markdown: `# ${p.data.title}\n\n${p.data.description ?? ''}`,
    },
  }));

  return {
    docs: entries,
    meta: [],
    toFumadocsSource: (options) => {
      const baseDir = options?.baseDir;
      const join = (p: string) => (baseDir ? `${baseDir}/${p}`.replace(/\/+/g, '/') : p);
      return {
        files: entries.map((e) => ({
          type: 'page' as const,
          path: join(e.info.path),
          absolutePath: e.info.fullPath,
          data: e,
        })),
      };
    },
  };
}

const docsCollection = makeCollection([
  {
    path: 'index.mdx',
    data: {
      title: 'Getting Started',
      description: 'Get started with @deessejs/errors.',
    },
  },
  {
    path: 'error-factory.mdx',
    data: {
      title: 'Error Factory',
      description: 'Create custom error types with the error() function.',
    },
  },
  {
    path: 'api-reference.mdx',
    data: {
      title: 'API Reference',
      description: 'Complete API reference for all exports from @deessejs/errors.',
    },
  },
]);

const blogCollection = makeCollection([
  {
    path: 'getting-started-with-deessejs-errors.mdx',
    data: {
      title: 'Getting Started with @deessejs/errors',
      description: 'Learn how to implement Python-inspired error handling in TypeScript.',
      author: 'Nesalia Inc',
      date: '2026-06-05',
    },
  },
]);

// `source.ts` calls `loader({ source: docs.toFumadocsSource() })`, so `docs`
// must be a CollectionShape instance. Re-export the collections directly.
export const docs = docsCollection;
export const blog = blogCollection;
