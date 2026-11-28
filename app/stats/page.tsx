import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatTripoliDateTime } from '@/lib/format';
import { getOrRefreshRates } from '@/lib/prices';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'إحصائيات حسابي والأسعار — ZarnixPay',
  description: 'ملخص تعاملاتك الشخصية وأسعار شراء وبيع USDT المباشرة في منصة ZarnixPay.',
};

export default async function StatsPage() {
  const user = await requireOnboardedUser();
  const [userStats, { rates }, siteContent, notifs] = await Promise.all([
    db.getUserStats(user.id),
    getOrRefreshRates(false),
    db.getSiteContent(),
    db.listUserNotifications(user.id, 50),
  ]);

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="tl-rate-card rounded-3xl p-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#10F5A6]" />
              <span>ملخص تداولاتك وأسعار الصرف</span>
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              إحصائيات عملياتك الشخصية ومؤشر أسعار الصرف المحدث لليوم
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-[#10F5A6] shrink-0" />
        </div>

        {/* Live Public Exchange Rates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400">سعر شراء USDT الحالي</div>
            <div className="text-2xl font-extrabold text-[#10F5A6] tabular-nums mt-1">
              {Number(rates.buy_rate).toFixed(3)} د.ل
            </div>
            <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
              {formatTripoliDateTime(rates.last_fetched_at)}
            </div>
          </div>
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400">سعر بيع USDT الحالي</div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-1">
              {Number(rates.sell_rate).toFixed(3)} د.ل
            </div>
            <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
              الحدود: {rates.min_order_usdt} – {rates.max_order_usdt} USDT
            </div>
          </div>
        </div>

        {/* Customer's Own Personal Activity Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10F5A6]" />
              <span>طلباتي المكتملة</span>
            </div>
            <div className="text-2xl font-extrabold text-[#10F5A6] tabular-nums mt-1">
              {userStats.completedOrders}
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>طلباتي قيد المتابعة</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-300 tabular-nums mt-1">
              {userStats.pendingOrders}
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400">إجمالي طلباتي</div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-1">
              {userStats.totalOrders}
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#10F5A6]" />
              <span>مشترياتي المكتملة</span>
            </div>
            <div className="text-xl font-extrabold text-white tabular-nums mt-1">
              {userStats.totalBoughtUsdt.toFixed(2)} USDT
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
              <span>مبيعاتي المكتملة</span>
            </div>
            <div className="text-xl font-extrabold text-white tabular-nums mt-1">
              {userStats.totalSoldUsdt.toFixed(2)} USDT
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400">إجمالي تعاملاتي بالدينار</div>
            <div className="text-xl font-extrabold text-sky-300 tabular-nums mt-1">
              {userStats.totalLydVolume.toFixed(2)} د.ل
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Link
            href="/orders"
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white hover:border-[#10F5A6]/40 transition"
          >
            عرض سجل عملياتي الكامل
          </Link>
          <Link
            href="/buy"
            className="px-4 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 text-xs font-extrabold hover:bg-emerald-400 transition"
          >
            بدء طلب شراء جديد
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
