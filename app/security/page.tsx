import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Database,
  Eye,
  FileCheck2,
  Fingerprint,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('security');
}

const SECURITY_PILLARS = [
  {
    icon: Smartphone,
    title: 'تحقق هاتفي برمز لمرة واحدة (OTP)',
    desc: 'كل عملية دخول موثقة برمز تحقق مؤقت ومشفّر يُرسل مباشرة لرقم هاتفك الليبي مع قيود صارمة على عدد المحاولات.',
  },
  {
    icon: Fingerprint,
    title: 'توثيق الهوية بالوثائق الرسمية (KYC)',
    desc: 'مراجعة جواز السفر وشهادة الميلاد وربط كل حساب بشخصية حقيقية للحد من الحسابات الوهمية والاحتيال.',
  },
  {
    icon: FileCheck2,
    title: 'منع تكرار الحوالات ومعرّفات الشبكة',
    desc: 'فحص تلقائي وصارم لمنع إعادة استخدام رقم التحويل أو Transaction Hash أكثر من مرة أو عبر أكثر من حساب.',
  },
  {
    icon: Eye,
    title: 'رقابة مكافحة غسل الأموال (AML / CFT)',
    desc: 'مراقبة مستمرة للحوالات المشبوهة والتحقق من تطابق اسم المحوّل أو المستلم مع بيانات الحساب الموثقة.',
  },
  {
    icon: Database,
    title: 'عزل البيانات والملفات الخاصة',
    desc: 'تُحفظ الإيصالات ووثائق الهوية في مخازن خاصة محمية بصلاحيات وصول صارمة لا يمكن للغير تصفحها.',
  },
  {
    icon: Lock,
    title: 'جلسات مشفرة ومراجعة مزدوجة',
    desc: 'جلسات موقّعة رقمياً وإدارة صلاحيات مستقلة، مع تدقيق بشري إلزامي قبل اعتماد أي تحويل صادر.',
  },
];

export default async function SecurityPage() {
  return (
    <PublicInfoPage
      slug="security"
      badgeLabel="منظومة الحماية والامتثال"
      extraContent={
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECURITY_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2 hover:border-emerald-400/35 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-extrabold text-white">{item.title}</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-extrabold">
              <ShieldAlert className="w-4 h-4" />
              <span>تنبيه أمني هام لعملائنا</span>
            </div>
            <ul className="space-y-1.5 text-slate-200 list-disc list-inside leading-relaxed">
              <li>لن يطلب فريق تيتر ليبيا منك أبداً رمز التحقق (OTP) أو كلمة مرور أي محفظة خاصة.</li>
              <li>لا ترسل أموالاً أو أصولاً رقمية إلا للحسابات والمحافظ المعروضة رسمياً داخل صفحة الطلب النشط.</li>
              <li>تحقق دائماً من نطاق المنصة الرسمي وتجنب الروابط أو الحسابات المجهولة على مواقع التواصل.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#071124] border border-white/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck className="w-5 h-5 text-[#10F5A6]" />
              <span>للاطلاع على التفاصيل القانونية الكاملة يمكنك مراجعة اتفاقية الاستخدام.</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/terms" className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:border-white/25">
                الشروط والأحكام
              </Link>
              <Link href="/account" className="px-3.5 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold">
                حالة توثيق حسابي
              </Link>
            </div>
          </div>
        </div>
      }
    />
  );
}
