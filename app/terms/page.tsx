import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, FileText, Scale, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('terms');
}

const LEGAL_ARTICLES = [
  {
    num: 'المادة 1',
    title: 'إخلاء المسؤولية التامة عن الاستخدام غير المشروع للأموال',
    highlight: true,
    body: 'تخلي منصة ZarnixPay وإدارتها ومشغلوها مسؤوليتهم القانونية والمالية والجزائية التامة عن أي تصرف غير لائق أو استخدام غير قانوني أو مشبوه للأموال المحوّلة أو الأصول الرقمية (USDT) المشتراة أو المباعة عبر المنصة. يقر المستخدم إقراراً صريحاً غير قابل للنقض بأن المنصة تقتصر مهمتها على الوساطة والتنفيذ الفني المباشر للطلبات ولا تتحمل أي تبعات ناتجة عن وجهة الأموال أو طبيعة التعاملات التي يجريها العميل مع أطراف ثالثة.',
  },
  {
    num: 'المادة 2',
    title: 'مكافحة غسل الأموال ومراقبة التحويلات المشبوهة (AML / CFT)',
    highlight: true,
    body: 'تخضع كافة العمليات والحوالات المصرفية والرقمية عبر المنصة للمراقبة والفحص والتدقيق المستمر. يُحظر تماماً استخدام المنصة لتمرير أموال ناتجة عن احتيال، ابتزاز، سرقة، تجارة محظورة، أو أي نشاط مخالف للقوانين المحلية والدولية. تحتفظ الإدارة بالحق الكامل في تعليق أي عملية محل اشتباه وطلب مستندات إضافية لإثبات مشروعية مصدر الأموال، والتعاون الكامل مع الجهات الرقابية والقضائية المختصة عند الضرورة.',
  },
  {
    num: 'المادة 3',
    title: 'أهلية التسجيل وملكية الحسابات المصرفية',
    body: 'يشترط لاستخدام المنصة أن يكون العميل بالغاً للأهلية القانونية وأن يقدم بيانات حقيقية وصحيحة (الاسم، اللقب، مكان السكن، صورة جواز السفر وشهادة الميلاد). يلتزم المستخدم بأن تكون جميع التحويلات عبر LYPay أو OnePay أو المصارف المحلية صادرة أو واردة إلى حسابات مملوكة له شخصياً ومطابقة لوثائقه.',
  },
  {
    num: 'المادة 4',
    title: 'التوثيق والمراجعة وإعادة التحقق من المستندات',
    body: 'يُفتح حساب العميل مباشرة بعد استكمال التسجيل والمستندات، ويخضع لمراجعة فريق الامتثال. في حال تبين أن أياً من الصور غير واضح أو منتهي الصلاحية أو غير مطابق، يحق للمنصة إرسال إشعار رسمي بإعادة التوثيق وتقييد تنفيذ المعاملات لحين تصحيح المستندات.',
  },
  {
    num: 'المادة 5',
    title: 'نهائية المعاملات على شبكة TRON (TRC20)',
    body: 'يتحمل العميل المسؤولية الكاملة عن دقة عنوان المحفظة الرقمية المدخل ونوع الشبكة (TRON TRC20 حصراً). المعاملات المنفذة عبر البلوكشين نهائية ولا يمكن التراجع عنها أو تعديلها، ولا تتحمل المنصة أي خسائر ناتجة عن أخطاء الإدخال من طرف المستخدم.',
  },
  {
    num: 'المادة 6',
    title: 'تحديث الأسعار والحدود التشغيلية',
    body: 'تُحتسب الأسعار النهائية في وقت إنشاء الطلب وتُثبّت لكل طلب على حدة، كما تحتفظ الإدارة بحق تعديل حدود الشراء والبيع أو تعليق أحد المسارات مؤقتاً لأسباب تقنية أو تشغيلية أو أمنية.',
  },
];

export default async function TermsPage() {
  return (
    <PublicInfoPage
      slug="terms"
      badgeLabel="الإطار القانوني والامتثال"
      extraContent={
        <div className="space-y-4">
          <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-4 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <p className="text-rose-100 leading-relaxed font-semibold">
              تنويه قانوني ملزم: استخدامك للمنصة يعني موافقتك التامة على إخلاء مسؤولية ZarnixPay عن أي تصرف غير لائق بالأموال وخضوع كافة الحوالات للمراقبة والتدقيق المالي.
            </p>
          </div>

          <div className="space-y-3">
            {LEGAL_ARTICLES.map((art) => (
              <section
                key={art.num}
                className={`rounded-2xl p-4 border space-y-1.5 ${
                  art.highlight
                    ? 'bg-[#081632] border-amber-400/30'
                    : 'bg-[#071124] border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-bold text-[#10F5A6]">
                    {art.num}
                  </span>
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    {art.highlight ? (
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                    ) : (
                      <Scale className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                    <span>{art.title}</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-loose">{art.body}</p>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#071124] border border-white/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4 text-[#10F5A6]" />
              <span>راجع أيضاً سياسة حماية البيانات والإفصاحات.</span>
            </div>
            <div className="flex gap-2">
              <Link href="/privacy" className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold">
                سياسة الخصوصية
              </Link>
              <Link href="/risk-disclosure" className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 text-[#10F5A6] font-bold inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>الإفصاحات والمخاطر</span>
              </Link>
            </div>
          </div>
        </div>
      }
    />
  );
}
