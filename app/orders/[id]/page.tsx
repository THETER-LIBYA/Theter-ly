import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { OrderDetailClient } from '@/components/OrderDetailClient';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'تفاصيل الطلب — تيتر ليبيا',
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [siteContent, user, admin, order] = await Promise.all([
    db.getSiteContent(),
    getSessionUser(),
    isAdminAuthenticated(),
    db.getOrderById(id),
  ]);

  if (!admin.authorized && (!user || !user.terms_accepted_at || !user.onboarding_completed)) {
    redirect('/');
  }

  if (!order || (!admin.authorized && order.user_id !== user?.id)) {
    return (
      <AppShell siteContent={siteContent} user={user}>
        <div className="tl-glass-card rounded-3xl p-6 text-center max-w-md mx-auto my-6 space-y-4">
          <h1 className="text-lg font-bold text-white">الطلب غير موجود أو غير مصرح بالوصول</h1>
          <Link href="/orders" className="inline-flex px-5 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold">
            العودة لسجل العمليات
          </Link>
        </div>
      </AppShell>
    );
  }

  const history = await db.getOrderHistory(order.id);
  let unread = 0;
  if (user) {
    const notifs = await db.listUserNotifications(user.id, 50);
    unread = notifs.filter((n) => !n.is_read).length;
  }

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <OrderDetailClient initialOrder={order} initialHistory={history} />
    </AppShell>
  );
}
