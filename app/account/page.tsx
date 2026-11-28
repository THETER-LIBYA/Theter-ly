import type { Metadata } from 'next';
import { AccountClient } from '@/components/AccountClient';
import { AppShell } from '@/components/AppShell';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'الملف الشخصي — ZarnixPay',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireOnboardedUser();
  const [siteContent, notifs, orders] = await Promise.all([
    db.getSiteContent(),
    db.listUserNotifications(user.id, 50),
    db.listOrders({ userId: user.id, limit: 200 }),
  ]);
  const unread = notifs.filter((n) => !n.is_read).length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <AccountClient
        user={user}
        stats={{ ordersCount: orders.length, completedCount }}
      />
    </AppShell>
  );
}
