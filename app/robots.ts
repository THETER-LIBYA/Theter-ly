import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://tetherlibya.ly';

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
