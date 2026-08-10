import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { baseUrl, gitConfig } from '@/lib/shared';
import './global.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || baseUrl),
  title: {
    template: '%s | @deessejs/errors',
    default: '@deessejs/errors — TypeScript Error Handling',
  },
};

function JsonLd() {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '@deessejs/errors',
    url: baseUrl,
    description:
      'TypeScript error handling library with exception chaining and hierarchical inheritance',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/docs?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nesalia Inc',
    url: 'https://nesalia.com',
    logo: `${baseUrl}/icon.svg`,
    sameAs: [`https://github.com/${gitConfig.user}`],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([websiteJsonLd, organizationJsonLd]).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="@deessejs/errors Blog"
          href="/blog/rss.xml"
        />
        <meta
          name="google-site-verification"
          content="0RLsnP4YRHmMY4H36hDjwCJekCf62MsZpnNGZ1mJwww"
        />
        <JsonLd />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}

// Re-export the JSON-LD component so the SEO regression suite can render the
// same blocks without booting the full layout (which depends on `next/font`,
// Vercel Analytics, and the Fumadocs UI provider — none of which work under
// happy-dom).
export { JsonLd };
