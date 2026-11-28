import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertOctagon, AlertTriangle, CheckCircle2, Network, ShieldAlert, TrendingUp } from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('risk-disclosure');
}

const RISKS = [
  {
    icon: Network,
    title: 'نهائية التحويلات على شبكة البلوكشين',
    level: 'تنبيه حرج',
    cls: 'text-rose-300 border-rose-400/30',
    desc: 'جميع التحويلات المنفذة عبر شبكة TRON (TRC20) غير قابلة للإلغاء أو الاسترداد. إدخال عنوان محفظة خاطئ أو التحويل عبر شبكة مختلفة (مثل ERC20 أو BEP20) قد يؤدي إلى فقدان الأصول بشكل دائم.',
  },
  {
    icon: TrendingUp,
    title: 'تقلبات أسعار الصرف في السوق الموازي',
    level: 'تنبيه مالي',
    cls: 'text-amber-300 border-amber-400/30',
    desc: 'تتغير أسعار الصرف بين الدولار والدينار الليبي وفق العرض والطلب في السوق المحلي. يُثبّت السعر لكل طلب لحظة إنشائه، ولا يضمن السعر الحالي بقاءه ثابتاً في الطلبات المستقبلية.',
  },
  {
    icon: AlertTriangle,
    title: 'الامتثال ومراجعة مصدر الأموال',
    level: 'تنبيه تنظيمي',
    cls: 'text-sky-300 border-sky-400/30',
    desc: 'تخضع كافة التحويلات للمراجعة اليدوية والرقابة الأمنية. أي تضارب في اسم المحوّل أو المستفيد أو إرفاق إيصال غير مطابق قد يؤدي إلى تعليق الطلب أو رفضه لحين استيفاء التوضيحات.',
  },
  {
    icon: AlertOctagon,
    title: 'عدم تقديم مشورة استثمارية',
    level: 'إفصاح تشغيلي',
    cls: 'text-[#10F5A6] border-emerald-400/30',
    desc: 'ZarnixPay هي منصة تنفيذ مباشر لعمليات الشراء والبيع وليست مستشاراً مالياً أو استثمارياً، ويتحمل المستخدم وحده قراراته المالية والغرض من معاملاته.',
  },
];

const CHECKLIST = [
  'تأكد من تطابق عنوان محفظة الاستلام وأنه يبدأ بحرف T على شبكة TRC20.',
  'نفّذ التحويل المصرفي من حسابك الشخصي بنفس الاسم المسجل في المنصة.',
  'احتفظ برقم الطلب ورقم الحوالة المرجعي لحين اكتمال التنفيذ.',
  'لا تعتمد على أي حسابات غير موثقة خارج واجهة المنصة الرسمية.',
];

export default async function RiskDisclosurePage() {
  return (
    <PublicInfoPage
      slug="risk-disclosure"
      badgeLabel="إفصاحات المخاطر والتنبيهات"
      extraContent={
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RISKS.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.title} className={`rounded-2xl bg-[#071124] border p-4 space-y-2 ${r.cls.split(' ')[1]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-white text-sm">
                      <Icon className={`w-4 h-4 shrink-0 ${r.cls.split(' ')[0]}`} />
                      <span>{r.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold shrink-0 ${r.cls.split(' ')[0]}`}>
                      {r.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2.5 text-xs">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#10F5A6]" />
              <span>قائمة التحقق السريعة قبل كل عملية</span>
            </h2>
            <ul className="space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#10F5A6] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/terms" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs">
              قراءة الشروط والأحكام
            </Link>
            <Link href="/security" className="px-4 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs">
              الأمان والموثوقية
            </Link>
          </div>
        </div>
      }
    />
  );
}
