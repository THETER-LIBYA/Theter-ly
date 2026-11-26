import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { NotificationsClient } from '@/components/NotificationsClient';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'مركز الإشعارات — تيتر ليبيا',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const [siteContent, notifications, preferences] = await Promise.all([
    db.getSiteContent(),
    db.listUserNotifications(user.id, 60),
    db.getUserNotificationPreferences(user.id),
  ]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unreadCount}>
      <NotificationsClient
        userId={user.id}
        initialNotifications={notifications}
        initialPreferences={preferences}
      />
    </AppShell>
  );
}
