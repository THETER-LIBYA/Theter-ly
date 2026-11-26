import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Building2, CheckCircle2, Clock, Globe, ShieldCheck, Users } from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { db } from '@/lib/db';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('about');
}

export default async function AboutPage() {
  const stats = await db.getPublicStats();

  return (
    <PublicInfoPage
      slug="about"
      badgeLabel="هويتنا ورؤيتنا"
      extraContent={
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4">
              <Users className="w-5 h-5 text-sky-400 mx-auto" />
              <div className="text-xl font-extrabold text-white tabular-nums mt-1.5">{stats.totalUsers}</div>
              <div className="text-[11px] text-slate-400">عميل مسجل</div>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4">
              <CheckCircle2 className="w-5 h-5 text-[#10F5A6] mx-auto" />
              <div className="text-xl font-extrabold text-[#10F5A6] tabular-nums mt-1.5">{stats.completedOrders}</div>
              <div className="text-[11px] text-slate-400">عملية منجزة</div>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 col-span-2 sm:col-span-1">
              <Clock className="w-5 h-5 text-amber-300 mx-auto" />
              <div className="text-xl font-extrabold text-white mt-1.5">5 – 30 د</div>
              <div className="text-[11px] text-slate-400">متوسط زمن التنفيذ</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-white text-sm">
                <Building2 className="w-4 h-4 text-[#10F5A6]" />
                <span>الربط المصرفي المحلي المباشر</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                تم تصميم البنية التشغيلية لتوافق طرق الدفع المعتمدة في السوق الليبي مثل LYPay وOnePay والمصارف التجارية المحلية مع تتبع مرجعي دقيق لكل حوالة.
              </p>
            </div>

            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-white text-sm">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>تسعير شفاف ومحدث باستمرار</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                تُحدَّث أسعار الشراء والبيع بصورة دورية وفق مؤشرات السوق الموازي الفعلية مع إظهار القيمة الصافية بالدينار الليبي قبل اعتماد أي طلب.
              </p>
            </div>

            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-white text-sm">
                <ShieldCheck className="w-4 h-4 text-[#10F5A6]" />
                <span>الامتثال والمسؤولية المؤسسية</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                نطبق ضوابط تحقق من الهوية ومراقبة العمليات المشبوهة لحماية بيئة التداول وضمان استمرارية الخدمة بأعلى موثوقية ممكنة.
              </p>
            </div>

            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-white text-sm">
                <Award className="w-4 h-4 text-amber-300" />
                <span>دعم متواصل وتجربة احترافية</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                فريق الدعم الفني والمراجعة المالية يتابع الطلبات خطوة بخطوة مع إشعارات فورية واضحة عبر التطبيق والمتصفح.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              href="/how-it-works"
              className="px-4 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs"
            >
              تعرّف على آلية العمل
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs hover:border-white/30"
            >
              تواصل مع الفريق
            </Link>
          </div>
        </div>
      }
    />
  );
}
