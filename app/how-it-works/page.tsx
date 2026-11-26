import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('how-it-works');
}

const BUY_STEPS = [
  {
    step: '01',
    title: 'تحديد المبلغ وحساب الدينار',
    desc: 'أدخل كمية USDT المطلوبة لتظهر لك القيمة الدقيقة بالدينار الليبي تلقائياً وفق سعر الصرف المباشر.',
  },
  {
    step: '02',
    title: 'اختيار وسيلة الدفع والتحويل',
    desc: 'اختر LYPay أو OnePay أو التحويل المصرفي المحلي وانسخ بيانات الحساب المعروضة بدقة.',
  },
  {
    step: '03',
    title: 'إرفاق الإيصال وعنوان TRON',
    desc: 'أدخل اسم المحوّل والمصرف والرقم المرجعي وأرفق صورة الإيصال مع عنوان محفظة TRON (TRC20) الخاصة بك.',
  },
  {
    step: '04',
    title: 'المراجعة والإرسال المباشر',
    desc: 'يتحقق فريق المراجعة من الحوالة المصرفية ثم يرسل USDT مباشرة إلى محفظتك ويصلك رقم العملية.',
  },
];

const SELL_STEPS = [
  {
    step: '01',
    title: 'تحديد الكمية ومراجعة الصرف',
    desc: 'أدخل كمية USDT المراد بيعها لمشاهدة صافي المبلغ المستحق بالدينار الليبي قبل الإرسال.',
  },
  {
    step: '02',
    title: 'الإرسال إلى محفظة المنصة',
    desc: 'انسخ عنوان محفظة المنصة أو امسح رمز QR وأرسل الكمية حصراً عبر شبكة TRON (TRC20).',
  },
  {
    step: '03',
    title: 'توثيق TX Hash والحساب المصرفي',
    desc: 'أدخل معرّف المعاملة (64 خانة) والاسم الثلاثي والمصرف ورقم الحساب الليبي (أو IBAN).',
  },
  {
    step: '04',
    title: 'التحقق وتحويل الدينار الليبي',
    desc: 'فور تأكيد الوصول على البلوكشين، يتم تحويل القيمة بالدينار الليبي مباشرة لحسابك المصرفي مع إثبات التحويل.',
  },
];

export default async function HowItWorksPage() {
  return (
    <PublicInfoPage
      slug="how-it-works"
      badgeLabel="دليل التداول المباشر"
      extraContent={
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#071124] border border-emerald-400/25 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 flex items-center justify-center text-[#10F5A6]">
                    <ArrowDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">مسار شراء USDT</h2>
                    <p className="text-[11px] text-[#10F5A6]">من الحساب المصرفي إلى محفظتك</p>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                {BUY_STEPS.map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl bg-[#0B1730] border border-white/5 p-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-[#10F5A6] font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/buy"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition"
              >
                <span>بدء طلب شراء USDT الآن</span>
              </Link>
            </div>

            <div className="rounded-2xl bg-[#071124] border border-sky-400/25 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">مسار بيع USDT</h2>
                    <p className="text-[11px] text-sky-300">من محفظة TRON إلى حسابك الليبي</p>
                  </div>
                </div>
                <QrCode className="w-5 h-5 text-slate-500" />
              </div>

              <div className="space-y-3">
                {SELL_STEPS.map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl bg-[#0B1730] border border-white/5 p-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-300 font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/sell"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0E8BFF] to-[#0043BD] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition"
              >
                <span>بدء طلب بيع USDT الآن</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-1.5">
              <Wallet className="w-5 h-5 text-[#10F5A6]" />
              <div className="font-bold text-white">بدون محفظة داخلية</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لا نحتجز أرصدتك؛ كل عملية تنتقل مباشرة إلى عنوانك الخارجي أو حسابك المصرفي.
              </p>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-1.5">
              <Clock className="w-5 h-5 text-sky-400" />
              <div className="font-bold text-white">سرعة المراجعة</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                زمن التنفيذ المعتاد من 5 إلى 30 دقيقة مع إشعارات لحظية عند كل مرحلة.
              </p>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              <div className="font-bold text-white">مراجعة بشرية دقيقة</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                يتم فحص كل إيصال ومعرّف شبكة يدوياً لضمان التطابق وحماية العميل.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-[#10F5A6]/25 p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#10F5A6] shrink-0" />
              <span className="text-slate-200">
                تأكد دائماً من مطابقة اسم صاحب الحساب المصرفي مع بيانات هويتك الموثقة في المنصة.
              </span>
            </div>
            <Link href="/security" className="text-[#10F5A6] font-bold shrink-0 hover:underline">
              معايير الأمان
            </Link>
          </div>
        </div>
      }
    />
  );
}
