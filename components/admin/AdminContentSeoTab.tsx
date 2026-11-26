'use client';

import React, { useState } from 'react';
import { Globe, Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react';
import type { SeoSetting, SiteContent } from '@/lib/types';

export function AdminContentTab({
  content: initialContent,
  onReload,
}: {
  content: SiteContent;
  onReload: () => void;
}) {
  const [msg, setMsg] = useState('');
  return (
    <ContentEditorBody
      key={initialContent.updated_at}
      initialContent={initialContent}
      msg={msg}
      setMsg={setMsg}
      onReload={onReload}
    />
  );
}

function ContentEditorBody({
  initialContent,
  msg,
  setMsg,
  onReload,
}: {
  initialContent: SiteContent;
  msg: string;
  setMsg: (val: string) => void;
  onReload: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [selectedSlug, setSelectedSlug] = useState('about');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pageKeys = Object.keys(content.public_pages_json || {}).filter((k) => !k.startsWith('__'));
  const activePage = content.public_pages_json?.[selectedSlug] || {
    slug: selectedSlug,
    title_ar: selectedSlug,
    subtitle_ar: '',
    body_ar: '',
    is_visible: true,
  };

  const uploadBrandingAsset = async (
    file: File,
    target: 'logo_with_pwa' | 'promo_banner'
  ) => {
    setUploading(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'branding');
      if (target === 'logo_with_pwa') fd.append('generatePwaIcons', '1');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as {
        url?: string;
        generatedIcons?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setMsg(data.error || 'فشل رفع الصورة');
        return;
      }

      if (target === 'logo_with_pwa') {
        const nextContent = {
          ...content,
          logo_url: data.generatedIcons?.logo_url || data.url,
          icon_192_url: data.generatedIcons?.icon_192_url || content.icon_192_url,
          icon_512_url: data.generatedIcons?.icon_512_url || content.icon_512_url,
          icon_maskable_url: data.generatedIcons?.icon_maskable_url || content.icon_maskable_url,
          apple_touch_icon_url: data.generatedIcons?.apple_touch_icon_url || content.apple_touch_icon_url,
        };
        setContent(nextContent);
        await fetch('/api/admin/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextContent),
        });
        setMsg('تم تحديث الشعار وتوليد أيقونات PWA (192x192, 512x512, Apple Touch) تلقائياً!');
        onReload();
      } else {
        const nextContent = { ...content, promo_banner_image_url: data.url };
        setContent(nextContent);
        await fetch('/api/admin/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promo_banner_image_url: data.url }),
        });
        setMsg('تم تحديث صورة البانر الإعلاني بنجاح.');
        onReload();
      }
    } finally {
      setUploading(false);
    }
  };

  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (res.ok) {
        setMsg('تم حفظ محتوى التطبيق والهوية البصرية بنجاح.');
        onReload();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={saveContent} className="space-y-5">
      {msg && <p className="text-xs text-[#10F5A6] font-bold">{msg}</p>}

      {/* Brand Identity & PWA Icons */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#10F5A6]" />
          <span>الهوية البصرية والشعار وأيقونات PWA</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex items-center gap-4">
            <img
              src={content.logo_url}
              alt="شعار المنصة"
              className="w-16 h-16 rounded-2xl object-cover bg-[#050B18] border border-emerald-400/30"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-2">
              <p className="font-bold text-white">الشعار والأيقونة الرئيسية + PWA</p>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 text-[#10F5A6] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'جاري المعالجة...' : 'رفع شعار جديد (PNG/JPG)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => e.target.files?.[0] && uploadBrandingAsset(e.target.files[0], 'logo_with_pwa')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 flex items-center gap-4">
            <img
              src={content.promo_banner_image_url}
              alt="البانر الإعلاني"
              className="w-24 h-16 rounded-xl object-cover border border-indigo-400/30"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-2">
              <p className="font-bold text-white">صورة البانر الإعلاني</p>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/35 text-sky-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>تغيير صورة البانر</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => e.target.files?.[0] && uploadBrandingAsset(e.target.files[0], 'promo_banner')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">اسم التطبيق (عربي)</label>
            <input
              type="text"
              value={content.app_name_ar}
              onChange={(e) => setContent({ ...content, app_name_ar: e.target.value })}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">App Name (English)</label>
            <input
              type="text"
              dir="ltr"
              value={content.app_name_en}
              onChange={(e) => setContent({ ...content, app_name_en: e.target.value })}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">العبارة الترحيبية أسفل الشعار</label>
            <input
              type="text"
              value={content.tagline_ar}
              onChange={(e) => setContent({ ...content, tagline_ar: e.target.value })}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">عنوان البانر الإعلاني</label>
            <input
              type="text"
              value={content.promo_banner_title}
              onChange={(e) => setContent({ ...content, promo_banner_title: e.target.value })}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">العبارة الفرعية للبانر</label>
            <input
              type="text"
              value={content.promo_banner_subtitle}
              onChange={(e) => setContent({ ...content, promo_banner_subtitle: e.target.value })}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
            />
          </div>
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#071124] border border-white/15 self-end cursor-pointer">
            <input
              type="checkbox"
              checked={content.maintenance_mode}
              onChange={(e) => setContent({ ...content, maintenance_mode: e.target.checked })}
              className="accent-amber-500"
            />
            <span className="text-amber-300 font-bold">تفعيل وضع الصيانة</span>
          </label>
        </div>

        <div className="text-xs">
          <label className="block text-slate-300 mb-1">رسالة الصيانة للمستخدمين</label>
          <input
            type="text"
            value={content.maintenance_message}
            onChange={(e) => setContent({ ...content, maintenance_message: e.target.value })}
            placeholder="المنصة تحت الصيانة المجدولة حالياً، سنعود قريباً."
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Support & Social Links */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white">بيانات الدعم والتواصل الاجتماعي</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            dir="ltr"
            value={content.support_phone}
            onChange={(e) => setContent({ ...content, support_phone: e.target.value })}
            placeholder="هاتف الدعم"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="text"
            dir="ltr"
            value={content.support_whatsapp}
            onChange={(e) => setContent({ ...content, support_whatsapp: e.target.value })}
            placeholder="رابط واتساب"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="email"
            dir="ltr"
            value={content.support_email}
            onChange={(e) => setContent({ ...content, support_email: e.target.value })}
            placeholder="البريد الإلكتروني"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="url"
            dir="ltr"
            value={content.telegram_url}
            onChange={(e) => setContent({ ...content, telegram_url: e.target.value })}
            placeholder="رابط Telegram"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="url"
            dir="ltr"
            value={content.facebook_url}
            onChange={(e) => setContent({ ...content, facebook_url: e.target.value })}
            placeholder="رابط Facebook"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Public Pages Content Editor */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">تحرير محتوى الصفحات العامة</h3>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-1.5 text-white"
          >
            {pageKeys.map((k) => (
              <option key={k} value={k}>
                {content.public_pages_json[k]?.title_ar || k} (/{k})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={activePage.title_ar}
            onChange={(e) =>
              setContent({
                ...content,
                public_pages_json: {
                  ...content.public_pages_json,
                  [selectedSlug]: { ...activePage, title_ar: e.target.value },
                },
              })
            }
            placeholder="عنوان الصفحة"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="text"
            value={activePage.subtitle_ar}
            onChange={(e) =>
              setContent({
                ...content,
                public_pages_json: {
                  ...content.public_pages_json,
                  [selectedSlug]: { ...activePage, subtitle_ar: e.target.value },
                },
              })
            }
            placeholder="العنوان الفرعي"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <label className="flex items-center gap-2 p-2 rounded-xl bg-[#071124] border border-white/15 cursor-pointer">
            <input
              type="checkbox"
              checked={activePage.is_visible}
              onChange={(e) =>
                setContent({
                  ...content,
                  public_pages_json: {
                    ...content.public_pages_json,
                    [selectedSlug]: { ...activePage, is_visible: e.target.checked },
                  },
                })
              }
              className="accent-[#10F5A6]"
            />
            <span className="text-white">إظهار الصفحة للعامة</span>
          </label>
        </div>

        <textarea
          rows={4}
          value={activePage.body_ar}
          onChange={(e) =>
            setContent({
              ...content,
              public_pages_json: {
                ...content.public_pages_json,
                [selectedSlug]: { ...activePage, body_ar: e.target.value },
              },
            })
          }
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white leading-relaxed"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs inline-flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>حفظ كافة التغييرات</span>
      </button>
    </form>
  );
}

export function AdminSeoTab({
  seoList,
  onReload,
}: {
  seoList: SeoSetting[];
  onReload: () => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState(seoList[0]?.page_slug || 'home');
  const [msg, setMsg] = useState('');
  const current = seoList.find((s) => s.page_slug === selectedSlug) || seoList[0];

  if (!current) return null;

  return (
    <SeoEditorBody
      key={`${current.id}:${current.updated_at}`}
      seoList={seoList}
      selectedSlug={selectedSlug}
      initialForm={current}
      msg={msg}
      setMsg={setMsg}
      onSelectSlug={(slug) => {
        setSelectedSlug(slug);
        setMsg('');
      }}
      onReload={onReload}
    />
  );
}

function SeoEditorBody({
  seoList,
  selectedSlug,
  initialForm,
  msg,
  setMsg,
  onSelectSlug,
  onReload,
}: {
  seoList: SeoSetting[];
  selectedSlug: string;
  initialForm: SeoSetting;
  msg: string;
  setMsg: (val: string) => void;
  onSelectSlug: (slug: string) => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState<SeoSetting>(initialForm);
  const [saving, setSaving] = useState(false);

  const handleSelect = (slug: string) => {
    onSelectSlug(slug);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg(`تم تحديث إعدادات SEO لصفحة /${form.page_slug === 'home' ? '' : form.page_slug} بنجاح.`);
        onReload();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="tl-glass-card rounded-2xl p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#10F5A6]" />
          <span>إدارة SEO ومحركات البحث (Schema, Sitemap, GA4, GSC)</span>
        </h2>

        <select
          value={selectedSlug}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
        >
          {seoList.map((s) => (
            <option key={s.id} value={s.page_slug}>
              /{s.page_slug === 'home' ? ' (الرئيسية)' : s.page_slug}
            </option>
          ))}
        </select>
      </div>

      {msg && <p className="text-[#10F5A6] font-bold">{msg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-300 mb-1">SEO Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Canonical URL</label>
          <input
            type="text"
            dir="ltr"
            value={form.canonical_url}
            onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white text-left"
          />
        </div>
      </div>

      <div>
        <label className="block text-slate-300 mb-1">Meta Description</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-300 mb-1">الكلمات المفتاحية (Keywords)</label>
          <input
            type="text"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Open Graph Image URL</label>
          <input
            type="text"
            dir="ltr"
            value={form.og_image_url}
            onChange={(e) => setForm({ ...form, og_image_url: e.target.value })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white text-left"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-300 mb-1">Schema.org Type</label>
          <select
            value={form.schema_type}
            onChange={(e) => setForm({ ...form, schema_type: e.target.value })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          >
            <option value="WebSite">WebSite</option>
            <option value="WebPage">WebPage</option>
            <option value="Organization">Organization</option>
            <option value="FAQPage">FAQPage</option>
            <option value="SoftwareApplication">SoftwareApplication</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Google Analytics 4 ID (G-XXXX)</label>
          <input
            type="text"
            dir="ltr"
            value={form.ga4_measurement_id}
            onChange={(e) => setForm({ ...form, ga4_measurement_id: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white text-left font-mono"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">Search Console Verification</label>
          <input
            type="text"
            dir="ltr"
            value={form.gsc_verification_code}
            onChange={(e) => setForm({ ...form, gsc_verification_code: e.target.value })}
            placeholder="google-site-verification token"
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white text-left font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.noindex}
            onChange={(e) => setForm({ ...form, noindex: e.target.checked })}
            className="accent-rose-500"
          />
          <span className="text-slate-200">منع الفهرسة (noindex) واستبعاد من Sitemap</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>حفظ إعدادات SEO</span>
        </button>
      </div>
    </form>
  );
}
