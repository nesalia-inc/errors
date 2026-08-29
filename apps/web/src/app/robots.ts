import { baseUrl } from '@/lib/shared';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/llms.txt', '/llms.mdx/', '/llms-full.txt', '/llms-full.txt/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
