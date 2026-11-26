import Link from 'next/link';
import { ChevronLeft, Home } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { JsonLd } from '@/components/JsonLd';
import { requireOnboardedUser } from '@/lib/auth';
import { db } from '@/lib/db';

interface PublicInfoPageProps {
  slug: string;
  badgeLabel?: string;
  extraContent?: React.ReactNode;
  faqItems?: Array<{ q: string; a: string }>;
}

export async function PublicInfoPage({
  slug,
  badgeLabel,
  extraContent,
  faqItems,
}: PublicInfoPageProps) {
  const user = await requireOnboardedUser();
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://tetherlibya.ly';
  const [siteContent, seo, notifs] = await Promise.all([
    db.getSiteContent(),
    db.getSeoSetting(slug),
    db.listUserNotifications(user.id, 50),
  ]);

  const unread = notifs.filter((n) => !n.is_read).length;

  const pageData = siteContent.public_pages_json?.[slug];
  const title = pageData?.title_ar || seo?.title || slug;
  const subtitle = pageData?.subtitle_ar || seo?.description || '';
  const body = pageData?.body_ar || '';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteContent.app_name_ar, item: baseUrl },
      { '@type': 'ListItem', position: 2, name: title, item: `${baseUrl}/${slug}` },
    ],
  };

  const pageSchema =
    faqItems && faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }
      : {
          '@context': 'https://schema.org',
          '@type': seo?.schema_type || 'WebPage',
          name: title,
          description: seo?.description || subtitle,
          url: `${baseUrl}/${slug}`,
          inLanguage: 'ar',
        };

  return (
    <AppShell siteContent={siteContent} user={user} unreadNotifications={unread}>
      <JsonLd data={[breadcrumbSchema, pageSchema]} />

      <div className="max-w-3xl mx-auto space-y-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-white inline-flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[#10F5A6] font-semibold">{title}</span>
        </nav>

        <article className="tl-glass-card rounded-3xl p-5 sm:p-6 space-y-5">
          <header className="space-y-2 border-b border-white/10 pb-4">
            {badgeLabel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/15 border border-[#10F5A6]/30 text-[11px] font-bold text-[#10F5A6]">
                {badgeLabel}
              </span>
            )}
            <h1 className="text-2xl font-extrabold text-white">{title}</h1>
            {subtitle && <p className="text-sm text-sky-300 font-semibold leading-relaxed">{subtitle}</p>}
          </header>

          {pageData?.is_visible === false ? (
            <p className="text-sm text-slate-400">هذه الصفحة مخفية مؤقتاً من إعدادات الإدارة.</p>
          ) : (
            <>
              {body && (
                <div className="rounded-2xl bg-[#071124]/80 border border-white/10 p-4 text-xs sm:text-sm text-slate-200 leading-loose whitespace-pre-line">
                  {body}
                </div>
              )}
              {extraContent}
            </>
          )}
        </article>
      </div>
    </AppShell>
  );
}
