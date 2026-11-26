import type { Metadata } from 'next';
import { Clock, Globe, Headphones, Mail, MessageCircle, Phone, Send, ShieldCheck } from 'lucide-react';
import { ContactFormClient } from '@/components/ContactFormClient';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { db } from '@/lib/db';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('contact');
}

export default async function ContactPage() {
  const siteContent = await db.getSiteContent();

  return (
    <PublicInfoPage
      slug="contact"
      badgeLabel="قنوات التواصل والدعم"
      extraContent={
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <a
              href={`tel:${siteContent.support_phone}`}
              className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex items-center gap-3 text-slate-200 hover:border-emerald-400/40 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6] shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">الهاتف المباشر</div>
                <div data-copyable="true" dir="ltr" className="font-bold text-white truncate">
                  {siteContent.support_phone}
                </div>
              </div>
            </a>

            <a
              href={siteContent.support_whatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex items-center gap-3 text-slate-200 hover:border-emerald-400/40 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6] shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">واتساب الدعم الفوري</div>
                <div className="font-bold text-[#10F5A6]">محادثة مباشرة</div>
              </div>
            </a>

            <a
              href={`mailto:${siteContent.support_email}`}
              className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex items-center gap-3 text-slate-200 hover:border-sky-400/40 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">البريد الرسمي</div>
                <div data-copyable="true" dir="ltr" className="font-bold text-white truncate">
                  {siteContent.support_email}
                </div>
              </div>
            </a>
          </div>

          {(siteContent.telegram_url || siteContent.facebook_url) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {siteContent.telegram_url && (
                <a
                  href={siteContent.telegram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 flex items-center gap-3 text-slate-200 hover:border-sky-400/40 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400">قناة Telegram</div>
                    <div dir="ltr" className="font-bold text-sky-300 truncate">{siteContent.telegram_url}</div>
                  </div>
                </a>
              )}
              {siteContent.facebook_url && (
                <a
                  href={siteContent.facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 flex items-center gap-3 text-slate-200 hover:border-sky-400/40 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-400">صفحة Facebook</div>
                    <div dir="ltr" className="font-bold text-indigo-300 truncate">{siteContent.facebook_url}</div>
                  </div>
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#10F5A6] shrink-0" />
              <span className="text-slate-300">متوسط الرد على التذاكر: أقل من 15 دقيقة</span>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-300">متابعة الطلبات وتحديثات التوثيق يومياً</span>
            </div>
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="text-slate-300">اذكر رقم الطلب (#) عند الاستفسار لتسريع الخدمة</span>
            </div>
          </div>

          <ContactFormClient />
        </div>
      }
    />
  );
}
