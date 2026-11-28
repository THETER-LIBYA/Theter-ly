import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { FaqAccordionClient, type FaqCategoryItem } from '@/components/FaqAccordionClient';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('faq');
}

const FAQ_ITEMS: FaqCategoryItem[] = [
  {
    category: 'التداول والأسعار',
    q: 'هل أحتاج إلى إنشاء محفظة داخلية للشراء أو البيع؟',
    a: 'لا، جميع عمليات الشراء والبيع في ZarnixPay تتم بشكل مباشر بين محفظتك الخارجية على شبكة TRON وحسابك المصرفي الليبي دون الاحتفاظ بأرصدة داخلية.',
  },
  {
    category: 'التداول والأسعار',
    q: 'كيف يتم احتساب أسعار الشراء والبيع؟',
    a: 'يرتبط السعر بمؤشر سعر الدولار في السوق المحلي وتحديثاته الحية مضافاً إليه هامش المنصة المحدد بشفافية وتظهر القيمة النهائية بالدينار قبل إرسال الطلب.',
  },
  {
    category: 'الدفع والتحويل',
    q: 'ما هي وسائل الدفع المدعومة حالياً؟',
    a: 'ندعم التحويل عبر خدمات الدفع الإلكتروني الليبية LYPay وOnePay إضافةً إلى التحويلات المصرفية المحلية المعتمدة داخل صفحة الشراء.',
  },
  {
    category: 'الدفع والتحويل',
    q: 'ما هي الشبكة المدعومة لاستلام وإرسال USDT؟',
    a: 'ندعم حالياً شبكة TRON (TRC20) حصراً لأنها الأسرع والأقل تكلفة. يرجى التأكد دوماً من اختيار TRC20 وبدء العنوان بحرف T لتجنب فقدان الأصول.',
  },
  {
    category: 'التوثيق والأمان',
    q: 'لماذا يُطلب مني رفع جواز السفر وشهادة الميلاد؟',
    a: 'لتوثيق ملكية الحساب ومطابقة اسم صاحب الحساب المصرفي وفق ضوابط مكافحة غسل الأموال والاحتيال المالي، وحماية أموال جميع العملاء.',
  },
  {
    category: 'التوثيق والأمان',
    q: 'ماذا أفعل إذا وصلني إشعار بطلب إعادة التوثيق؟',
    a: 'ادخل إلى صفحة "حسابي" وقم برفع صور واضحة ومكتملة الأطراف لجواز السفر وشهادة الميلاد في قسم إعادة التوثيق ليتم فحصها من جديد.',
  },
  {
    category: 'الدفع والتحويل',
    q: 'كم تستغرق مراجعة الطلب وتنفيذه؟',
    a: 'تتم مراجعة جميع الطلبات يدوياً بواسطة فريق الإشراف المالي خلال 5 إلى 30 دقيقة في أوقات العمل، ويصلك إشعار فوري عند كل تحديث لحالة الطلب.',
  },
];

export default async function FaqPage() {
  return (
    <PublicInfoPage
      slug="faq"
      badgeLabel="مركز المعرفة والإجابات"
      faqItems={FAQ_ITEMS}
      extraContent={
        <div className="space-y-5">
          <FaqAccordionClient items={FAQ_ITEMS} />

          <div className="rounded-2xl bg-[#071124] border border-sky-400/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-200">
              <MessageCircle className="w-5 h-5 text-[#10F5A6] shrink-0" />
              <span>لم تجد إجابة لسؤالك؟ فريق الدعم الفني متاح للرد على استفساراتك مباشرة.</span>
            </div>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-center shrink-0"
            >
              تواصل مع الدعم
            </Link>
          </div>
        </div>
      }
    />
  );
}
