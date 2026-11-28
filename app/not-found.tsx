import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { db } from '@/lib/db';

export default async function NotFound() {
  const siteContent = await db.getSiteContent();
  return (
    <AppShell siteContent={{ ...siteContent, public_pages_json: {} }} hideBottomNav>
      <div className="tl-glass-card rounded-3xl p-8 text-center my-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mx-auto text-sky-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-white">الصفحة غير موجودة (404)</h1>
        <p className="mt-2 text-sm text-slate-300">
          الرابط الذي تبحث عنه غير متاح أو تم نقله. يمكنك العودة إلى الصفحة الرئيسية لمنصة ZarnixPay.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-bold text-sm"
        >
          <Home className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    </AppShell>
  );
}
