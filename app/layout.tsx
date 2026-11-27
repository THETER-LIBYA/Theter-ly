import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { db } from '@/lib/db';
import { buildPageMetadata } from '@/lib/seo';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#050B18',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadata('home');
  const [content, seo] = await Promise.all([db.getSiteContent(), db.getSeoSetting('home')]);
  const gscCode = seo?.gsc_verification_code || process.env.NEXT_PUBLIC_GSC_VERIFICATION;

  return {
    ...base,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: content.app_name_ar,
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }],
      apple: [
        {
          url: content.apple_touch_icon_url || '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        },
      ],
    },
    verification: gscCode ? { google: gscCode } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seo = await db.getSeoSetting('home');
  const ga4Id = seo?.ga4_measurement_id || process.env.NEXT_PUBLIC_GA4_ID || '';

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="tl-canvas-bg text-slate-50 antialiased selection:bg-emerald-500/30 selection:text-emerald-200" suppressHydrationWarning>
        {children}

        {ga4Id && /^G-[A-Z0-9]+$/i.test(ga4Id) && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="tl-ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
