import type { Metadata } from 'next';
import { db } from './db';

export async function buildPageMetadata(slug: string, options?: { noindex?: boolean }): Promise<Metadata> {
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://tetherlibya.ly';
  const [seo, content] = await Promise.all([db.getSeoSetting(slug), db.getSiteContent()]);

  const title = seo?.title || `${content.app_name_ar} | ${content.app_name_en}`;
  const description =
    seo?.description ||
    `${content.tagline_ar} — منصة شراء وبيع USDT بالدينار الليبي مباشرة بأمان وسرعة.`;
  const canonicalPath = seo?.canonical_url || (slug === 'home' ? '/' : `/${slug}`);
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
  const ogImage = seo?.og_image_url || '/og-image.png';
  const shouldNoindex = options?.noindex ?? seo?.noindex ?? false;

  return {
    title,
    description,
    keywords: seo?.keywords ? seo.keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
    alternates: {
      canonical,
      languages: {
        ar: canonical,
      },
    },
    robots: shouldNoindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'ar_LY',
      siteName: `${content.app_name_ar} | ${content.app_name_en}`,
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      url: canonical,
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      images: [ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`],
    },
  };
}
