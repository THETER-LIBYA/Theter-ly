import type { Metadata } from 'next';
import { db } from './db';

export const OFFICIAL_SITE_URL = 'https://www.tether-ly.ly';

export function getOfficialSiteUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_URL?.trim();
  if (candidate && /^https:\/\/(www\.)?tether-ly\.ly\/?$/i.test(candidate)) {
    return OFFICIAL_SITE_URL;
  }
  return OFFICIAL_SITE_URL;
}

export function toOfficialAbsoluteUrl(
  urlOrPath: string | null | undefined,
  fallbackPath = '/og-image.png'
): string {
  const baseUrl = getOfficialSiteUrl();
  const raw = (urlOrPath || '').trim() || fallbackPath;
  if (/^https?:\/\/(www\.)?tetherlibya\.ly(\/|$)/i.test(raw)) {
    return raw.replace(/^https?:\/\/(www\.)?tetherlibya\.ly/i, baseUrl);
  }
  if (/^https?:\/\/(www\.)?tether-ly\.ly(\/|$)/i.test(raw)) {
    return raw.replace(/^https?:\/\/(www\.)?tether-ly\.ly/i, baseUrl);
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export async function buildPageMetadata(slug: string, options?: { noindex?: boolean }): Promise<Metadata> {
  const baseUrl = getOfficialSiteUrl();
  const [seo, content] = await Promise.all([db.getSeoSetting(slug), db.getSiteContent()]);

  const title = seo?.title || `${content.app_name_ar} | ${content.app_name_en}`;
  const description =
    seo?.description ||
    `${content.tagline_ar} — منصة شراء وبيع USDT بالدينار الليبي مباشرة بأمان وسرعة.`;
  const canonicalPath = seo?.canonical_url || (slug === 'home' ? '/' : `/${slug}`);
  const canonical = toOfficialAbsoluteUrl(canonicalPath, slug === 'home' ? '/' : `/${slug}`);
  const absoluteOgImage = toOfficialAbsoluteUrl(seo?.og_image_url, '/og-image.png');
  const shouldNoindex = options?.noindex ?? seo?.noindex ?? false;

  return {
    metadataBase: new URL(baseUrl),
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
          url: absoluteOgImage,
          secureUrl: absoluteOgImage,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      images: [absoluteOgImage],
    },
  };
}
