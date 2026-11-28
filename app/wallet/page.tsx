import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'المحفظة — ZarnixPay',
  robots: { index: false, follow: false },
};

export default async function WalletPage() {
  const user = await requireOnboardedUser();
  const [siteContent, notifs] = await Promise.all([
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
      <div className="max-w-lg mx-auto my-6">
        <div className="tl-glass-card rounded-3xl p-7 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-400/35 flex items-center justify-center mx-auto text-[#10F5A6] shadow-xl">
            <Wallet className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-xs font-bold text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد التطوير للإصدارات القادمة</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed">
            المحفظة ستتوفر قريباً، سوف يتم تفعيل المحفظة في تحديثات لاحقة
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            يمكنك حالياً تنفيذ جميع عمليات شراء وبيع USDT مباشرة وبأمان دون الحاجة لوجود محفظة داخلية.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/buy"
              className="tl-buy-card rounded-2xl py-3.5 px-4 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <ArrowDown className="w-4 h-4" />
              <span>شراء USDT</span>
            </Link>
            <Link
              href="/sell"
              className="tl-sell-card rounded-2xl py-3.5 px-4 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>بيع USDT</span>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
