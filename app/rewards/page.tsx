import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Bell, CheckCircle2, Crown, Gift, Sparkles, Zap } from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('rewards');
}

const LOYALTY_TIERS = [
  {
    name: 'العضوية الأساسية',
    req: 'حساب مكتمل البيانات',
    badge: 'قياسي',
    cls: 'border-white/15 text-slate-300',
    perks: ['تنفيذ مباشر لطلبات الشراء والبيع', 'إشعارات فورية بتحديثات الطلب', 'دعم فني عبر التذاكر والواتساب'],
  },
  {
    name: 'العضوية الموثقة (Verified)',
    req: 'اعتماد جواز السفر وشهادة الميلاد',
    badge: 'مُوصى به',
    cls: 'border-[#10F5A6]/45 text-[#10F5A6]',
    perks: ['أولوية متقدمة في مراجعة الإيصالات', 'حدود تداول يومية مرتفعة', 'أهلية كاملة للعروض الموسمية الخاصة'],
  },
  {
    name: 'نخبة العملاء (VIP)',
    req: 'تجاوز 10,000 USDT حجم تداول موثق',
    badge: 'نخبة',
    cls: 'border-amber-400/45 text-amber-300',
    perks: ['هوامش تسعيرية تفضيلية للكميات الكبيرة', 'مسار معالجة سريع للحوالات الكبيرة', 'تنسيق مباشر مع فريق العمليات'],
  },
];

export default async function RewardsPage() {
  return (
    <PublicInfoPage
      slug="rewards"
      badgeLabel="برنامج المزايا والولاء"
      extraContent={
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-l from-[#0B2A4A] to-[#071934] border border-[#10F5A6]/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10F5A6]">
                <Sparkles className="w-4 h-4" />
                <span>مزايا حصرية للحسابات الموثقة</span>
              </div>
              <h2 className="text-lg font-extrabold text-white">كلما ارتفع مستوى توثيقك زادت مزاياك</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                تمنح المنصة عملاءها الموثقين أولوية في المراجعة وحدود طلب أعلى وعروضاً دورية على هوامش الشراء والبيع.
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-[#10F5A6]/40 flex items-center justify-center text-[#10F5A6] shrink-0">
              <Gift className="w-7 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LOYALTY_TIERS.map((tier, idx) => (
              <div
                key={tier.name}
                className={`rounded-2xl bg-[#071124] border p-4 space-y-3 ${tier.cls.split(' ')[0]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    {idx === 2 ? (
                      <Crown className="w-4 h-4 text-amber-300" />
                    ) : idx === 1 ? (
                      <Award className="w-4 h-4 text-[#10F5A6]" />
                    ) : (
                      <Zap className="w-4 h-4 text-sky-400" />
                    )}
                    <span>{tier.name}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 ${tier.cls.split(' ')[1]}`}>
                    {tier.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{tier.req}</p>
                <ul className="space-y-1.5 pt-2 border-t border-white/10">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5 text-[11px] text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10F5A6] shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-200">
              <Bell className="w-5 h-5 text-sky-400 shrink-0" />
              <span>فعّل الإشعارات الفورية لتصلك عروض الأسعار التفضيلية ومواعيد التخفيضات فور إطلاقها.</span>
            </div>
            <Link
              href="/notifications"
              className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-center shrink-0"
            >
              إعدادات الإشعارات
            </Link>
          </div>
        </div>
      }
    />
  );
}
