import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://tetherlibya.ly';
  const [seoList, content] = await Promise.all([db.listSeoSettings(), db.getSiteContent()]);
  const pages = content.public_pages_json || {};

  const entries: MetadataRoute.Sitemap = [];

  for (const seo of seoList) {
    if (seo.noindex) continue;
    const slug = seo.page_slug;
    if (slug !== 'home' && pages[slug] && pages[slug].is_visible === false) {
      continue;
    }

    const path = slug === 'home' ? '' : `/${slug}`;
    entries.push({
      url: `${baseUrl}${path}`,
      lastModified: seo.updated_at ? new Date(seo.updated_at) : new Date(),
      changeFrequency: slug === 'home' ? 'hourly' : 'weekly',
      priority: slug === 'home' ? 1.0 : 0.8,
    });
  }

  return entries;
}
