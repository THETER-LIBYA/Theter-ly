import type { Metadata } from 'next';
import { BarChart3, CheckCircle2, Clock, TrendingUp, Users } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOrRefreshRates } from '@/lib/prices';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'الإحصائيات والأسعار المباشرة — تيتر ليبيا',
  description: 'إحصائيات التداول الحية وأسعار شراء وبيع USDT في منصة تيتر ليبيا.',
};

export default async function StatsPage() {
  const user = await requireOnboardedUser();
  const [stats, { rates }, siteContent, notifs] = await Promise.all([
    db.getPublicStats(),
    getOrRefreshRates(false),
    db.getSiteContent(),
    db.listUserNotifications(user.id, 50),
  ]);

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="tl-rate-card rounded-3xl p-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#10F5A6]" />
              <span>إحصائيات المنصة المباشرة</span>
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              بيانات فورية محدثة من قاعدة البيانات ومؤشر سعر الصرف المعتمد
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-[#10F5A6]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400">سعر شراء USDT</div>
            <div className="text-2xl font-extrabold text-[#10F5A6] tabular-nums mt-1">
              {Number(rates.buy_rate).toFixed(3)} د.ل
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400">سعر بيع USDT</div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-1">
              {Number(rates.sell_rate).toFixed(3)} د.ل
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>المستخدمون المسجلون</span>
            </div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-1">
              {stats.totalUsers}
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10F5A6]" />
              <span>العمليات المكتملة</span>
            </div>
            <div className="text-2xl font-extrabold text-[#10F5A6] tabular-nums mt-1">
              {stats.completedOrders}
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>قيد المراجعة</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-300 tabular-nums mt-1">
              {stats.pendingOrders}
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400">إجمالي حجم التداول</div>
            <div className="text-xl font-extrabold text-white tabular-nums mt-1">
              {stats.totalUsdtVolume.toFixed(2)} USDT
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
