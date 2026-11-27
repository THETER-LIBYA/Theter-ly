import type { MetadataRoute } from 'next';
import { getOfficialSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getOfficialSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/how-it-works',
          '/faq',
          '/contact',
          '/terms',
          '/privacy',
          '/risk-disclosure',
          '/security',
          '/rewards',
          '/support',
        ],
        disallow: [
          '/admin',
          '/api',
          '/login',
          '/account',
          '/orders',
          '/buy',
          '/sell',
          '/wallet',
          '/notifications',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
