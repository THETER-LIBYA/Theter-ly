import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { SellOrderForm } from '@/components/SellOrderForm';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOrRefreshRates } from '@/lib/prices';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'بيع USDT مباشر — ZarnixPay',
  robots: { index: false, follow: false },
};

export default async function SellPage() {
  const user = await requireOnboardedUser();
  const [{ rates }, wallets, siteContent, notifs] = await Promise.all([
    getOrRefreshRates(false),
    db.listPlatformWallets(true),
    db.getSiteContent(),
    db.listUserNotifications(user.id, 50),
  ]);

  const unreadNotifications = notifs.filter((n) => !n.is_read).length;

  return (
    <AppShell
      siteContent={siteContent}
      user={user}
      unreadNotifications={unreadNotifications}
    >
      {siteContent.maintenance_mode ? (
        <div className="tl-glass-card rounded-3xl p-6 text-center max-w-md mx-auto my-6 space-y-3 border border-amber-400/40">
          <h1 className="text-lg font-extrabold text-amber-300">المنصة في وضع الصيانة</h1>
          <p className="text-xs text-slate-200 leading-relaxed">{siteContent.maintenance_message}</p>
        </div>
      ) : (
        <SellOrderForm rates={rates} wallets={wallets} user={user} />
      )}
    </AppShell>
  );
}
