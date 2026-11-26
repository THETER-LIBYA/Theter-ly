import Link from 'next/link';
import { WifiOff, Home } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full tl-glass-card rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-white">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
          لإجراء عمليات الشراء والبيع أو متابعة أسعار الصرف الحية، يرجى التحقق من اتصال الشبكة والمحاولة مجدداً.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-bold text-sm hover:bg-emerald-400 transition"
        >
          <Home className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </Link>
      </div>
    </div>
  );
}
