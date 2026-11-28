import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clock, ShoppingCart } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatTripoliDateParts } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'سجل العمليات — ZarnixPay',
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'مكتملة', cls: 'bg-[#064E3B] text-[#10F5A6] border-[#10F5A6]/35' },
  approved: { label: 'معتمدة', cls: 'bg-sky-950 text-sky-300 border-sky-400/35' },
  under_review: { label: 'تحت المراجعة', cls: 'bg-amber-950 text-amber-300 border-amber-400/35' },
  pending_review: { label: 'قيد المراجعة', cls: 'bg-amber-950/70 text-amber-300 border-amber-400/30' },
  needs_edit: { label: 'يتطلب تعديل', cls: 'bg-orange-950 text-orange-300 border-orange-400/35' },
  rejected: { label: 'مرفوضة', cls: 'bg-rose-950 text-rose-300 border-rose-400/35' },
  cancelled: { label: 'ملغاة', cls: 'bg-slate-800 text-slate-300 border-slate-600' },
};

export default async function OrdersPage() {
  const user = await requireOnboardedUser();
  const [siteContent, orders, notifs] = await Promise.all([
    db.getSiteContent(),
    db.listOrders({ userId: user.id, limit: 100 }),
    db.listUserNotifications(user.id, 50),
  ]);
  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#10F5A6]" />
            <span>سجل العمليات ({orders.length})</span>
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/buy" className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
              شراء جديد
            </Link>
            <Link href="/sell" className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-bold text-xs">
              بيع جديد
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="tl-glass-card rounded-3xl p-8 text-center space-y-3">
            <p className="text-sm font-bold text-white">لا توجد عمليات مسجلة في حسابك بعد</p>
            <p className="text-xs text-slate-400">ابدأ أول عملية شراء أو بيع USDT مباشرة الآن.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending_review;
              const { dateStr: date, timeStr: time } = formatTripoliDateParts(order.created_at);
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="tl-glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-emerald-400/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-[#10F5A6] shrink-0">
                      {order.type === 'buy' ? <ShoppingCart className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{order.type === 'buy' ? 'شراء USDT' : 'بيع USDT'}</span>
                        <span className="text-[11px] font-mono text-slate-400">#{order.order_number}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                        {date} · {time} · {Number(order.lyd_amount).toFixed(3)} د.ل
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left">
                      <div className="text-sm font-extrabold text-[#10F5A6] tabular-nums">
                        {Number(order.usdt_amount).toFixed(2)} USDT
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        بسعر {Number(order.rate_applied).toFixed(3)}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
