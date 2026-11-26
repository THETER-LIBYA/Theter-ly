import { AppShell } from '@/components/AppShell';
import { HomeDashboard } from '@/components/HomeDashboard';
import { JsonLd } from '@/components/JsonLd';
import { LoginClient } from '@/components/LoginClient';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOrRefreshRates } from '@/lib/prices';
import type { Order } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://tetherlibya.ly';
  const [siteContent, user] = await Promise.all([
    db.getSiteContent(),
    getSessionUser(),
  ]);

  const schemaData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: `${siteContent.app_name_ar} | ${siteContent.app_name_en}`,
      url: baseUrl,
      logo: `${baseUrl}${siteContent.logo_url || '/images/brand-icon.png'}`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: siteContent.support_phone,
        contactType: 'customer service',
        availableLanguage: ['Arabic'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteContent.app_name_ar,
      url: baseUrl,
      inLanguage: 'ar',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `${siteContent.app_name_ar} | ${siteContent.app_name_en}`,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Android, iOS, Web',
      description: 'منصة تيتر ليبيا لشراء وبيع USDT بالدينار الليبي مباشرة عبر LYPay وOnePay وشبكة TRON.',
    },
  ];

  const gateSiteContent = { ...siteContent, public_pages_json: {} };

  // 1. Unauthenticated -> Show Login / Register Screen first
  if (!user) {
    return (
      <>
        <JsonLd data={schemaData} />
        <AppShell siteContent={gateSiteContent} hideBottomNav>
          <LoginClient nextPath="/" appName={siteContent.app_name_ar} isHomeGate />
        </AppShell>
      </>
    );
  }

  // 2. Authenticated but Legal Terms or Profile/KYC Documents not yet completed -> Onboarding Gate
  if (!user.terms_accepted_at || !user.onboarding_completed) {
    return (
      <>
        <JsonLd data={schemaData} />
        <AppShell siteContent={gateSiteContent} user={user} hideBottomNav>
          <OnboardingFlow user={user} appName={siteContent.app_name_ar} />
        </AppShell>
      </>
    );
  }

  // 3. Authenticated & Onboarded -> Live Rates + User Dashboard
  const [{ rates }, recentOrders, notifs] = await Promise.all([
    getOrRefreshRates(false),
    db.listOrders({ userId: user.id, limit: 5 }) as Promise<Order[]>,
    db.listUserNotifications(user.id, 50),
  ]);
  const unreadNotifications = notifs.filter((n) => !n.is_read).length;

  return (
    <>
      <JsonLd data={schemaData} />
      <HomeDashboard
        initialRates={rates}
        siteContent={siteContent}
        user={user}
        recentOrders={recentOrders}
        unreadNotifications={unreadNotifications}
      />
    </>
  );
}
