import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const content = await db.getSiteContent();

  return {
    id: '/',
    name: content.app_name_ar === content.app_name_en ? content.app_name_ar : `${content.app_name_ar} | ${content.app_name_en}`,
    short_name: (content.app_name_en || content.app_name_ar || 'ZarnixPay').slice(0, 12),
    description: `${content.tagline_ar} — منصة ZarnixPay لشراء وبيع USDT بالدينار الليبي مباشرة عبر LYPay وOnePay وشبكة TRON.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#050B18',
    theme_color: '#050B18',
    categories: ['finance', 'business'],
    icons: [
      {
        src: content.icon_192_url || '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: content.icon_512_url || '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: content.icon_maskable_url || '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
