import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, EyeOff, FileLock2, Lock, Server, ShieldCheck } from 'lucide-react';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('privacy');
}

const PRIVACY_SECTIONS = [
  {
    icon: Database,
    title: '1. البيانات التي نجمعها ونعالجها',
    body: 'نجمع فقط البيانات اللازمة لتشغيل الخدمة وتنفيذ الطلبات والامتثال المالي: رقم الهاتف، الاسم واللقب، مكان السكن في ليبيا، صور وثائق التوثيق (جواز السفر وشهادة الميلاد)، وبيانات الحوالات والإيصالات وعناوين محافظ TRON.',
  },
  {
    icon: FileLock2,
    title: '2. حماية مستندات الهوية والإيصالات',
    body: 'تُحفظ كافة صور جوازات السفر وشهادات الميلاد وإيصالات الدفع في مخازن خاصة مشفرة ومحمية بصلاحيات وصول صارمة. لا يمكن لأي مستخدم آخر أو جهة خارجية الوصول إلى ملفاتك، ويقتصر الاطلاع عليها على فريق المراجعة المخوّل.',
  },
  {
    icon: Lock,
    title: '3. أمن الجلسات ونقل البيانات',
    body: 'تستخدم المنصة بروتوكولات تشفير حديثة لنقل البيانات وجلسات دخول موقّعة رقمياً صالحة لفترات محدودة، مع رقابة دائمة لمنع الوصول غير المصرح به أو سرقة الجلسات.',
  },
  {
    icon: EyeOff,
    title: '4. عدم بيع البيانات أو مشاركتها تجارياً',
    body: 'نلتزم التزاماً مطلقاً بعدم بيع أو تأجير أو مشاركة بياناتك الشخصية أو معاملاتك مع أي شركات إعلانية أو أطراف ثالثة لأغراض تسويقية.',
  },
  {
    icon: Server,
    title: '5. الاحتفاظ بالسجلات والالتزام القانوني',
    body: 'تُحفظ سجلات المعاملات والقيود المالية والوثائق لفترات مناسبة تقتضيها متطلبات التدقيق المحاسبي والامتثال لمكافحة غسل الأموال، ولا تُكشف إلا استجابةً لمطالبة قانونية رسمية من الجهات المختصة.',
  },
];

export default async function PrivacyPage() {
  return (
    <PublicInfoPage
      slug="privacy"
      badgeLabel="حماية البيانات والخصوصية"
      extraContent={
        <div className="space-y-4">
          <div className="space-y-3">
            {PRIVACY_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <section key={sec.title} className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-1.5">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#10F5A6] shrink-0" />
                    <span>{sec.title}</span>
                  </h2>
                  <p className="text-xs text-slate-300 leading-loose">{sec.body}</p>
                </section>
              );
            })}
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-[#10F5A6]/25 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck className="w-5 h-5 text-[#10F5A6] shrink-0" />
              <span>لأي طلبات تتعلق بتحديث بياناتك أو الاستفسار عن سياسة الخصوصية تواصل معنا مباشرة.</span>
            </div>
            <Link href="/contact" className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold">
              تواصل مع الدعم
            </Link>
          </div>
        </div>
      }
    />
  );
}
