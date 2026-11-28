import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { LoginClient } from '@/components/LoginClient';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'تسجيل الدخول — ZarnixPay',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith('/') ? params.next : '/';
  if (user) {
    redirect(nextPath);
  }

  const siteContent = await db.getSiteContent();

  return (
    <AppShell siteContent={{ ...siteContent, public_pages_json: {} }} hideBottomNav>
      <LoginClient nextPath={nextPath} appName={siteContent.app_name_ar} isHomeGate />
    </AppShell>
  );
}
