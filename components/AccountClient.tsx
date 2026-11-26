'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Headphones,
  Loader2,
  LogOut,
  MapPin,
  Save,
  ShieldCheck,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { formatTripoliDateParts } from '@/lib/format';
import type { User } from '@/lib/types';

export function AccountClient({
  user: initialUser,
  stats,
}: {
  user: User;
  stats: { ordersCount: number; completedCount: number };
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [firstName, setFirstName] = useState(
    initialUser.first_name || initialUser.full_name.split(' ')[0] || ''
  );
  const [lastName, setLastName] = useState(
    initialUser.last_name || initialUser.full_name.split(' ').slice(1).join(' ') || ''
  );
  const [cityArea, setCityArea] = useState(initialUser.city_area || '');
  const [email, setEmail] = useState(initialUser.email || '');
  const [passportUrl, setPassportUrl] = useState(initialUser.passport_image_url || '');
  const [birthCertUrl, setBirthCertUrl] = useState(initialUser.birth_cert_image_url || '');

  const [saving, setSaving] = useState(false);
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [uploadingBirth, setUploadingBirth] = useState(false);
  const [resubmittingKyc, setResubmittingKyc] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const { isInstallable, isInstalled, installApp } = usePWA();

  const joined = formatTripoliDateParts(user.created_at).dateStr;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          city_area: cityArea,
          email,
        }),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (res.ok && data.user) {
        setUser(data.user);
        setMsg('تم تحديث بيانات الحساب بنجاح');
        router.refresh();
      } else {
        setErr(data.error || 'تعذر تحديث البيانات');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (
    kind: 'passport' | 'birth',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (kind === 'passport') setUploadingPassport(true);
    else setUploadingBirth(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'kyc');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErr(data.error || 'تعذر رفع المستند');
        return;
      }
      if (kind === 'passport') setPassportUrl(data.url);
      else setBirthCertUrl(data.url);
    } finally {
      if (kind === 'passport') setUploadingPassport(false);
      else setUploadingBirth(false);
    }
  };

  const handleResubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!passportUrl || !birthCertUrl) {
      setErr('يرجى التأكد من إرفاق صورتي جواز السفر وشهادة الميلاد');
      return;
    }
    setResubmittingKyc(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reverify_kyc: true,
          first_name: firstName,
          last_name: lastName,
          city_area: cityArea,
          passport_image_url: passportUrl,
          birth_cert_image_url: birthCertUrl,
        }),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (res.ok && data.user) {
        setUser(data.user);
        setMsg('تم إعادة إرسال مستندات التوثيق بنجاح للمراجعة الإدارية.');
        router.refresh();
      } else {
        setErr(data.error || 'تعذر إعادة إرسال المستندات');
      }
    } finally {
      setResubmittingKyc(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const statusMeta =
    user.kyc_status === 'verified'
      ? {
          label: 'حساب موثق',
          cls: 'bg-emerald-500/15 border-[#10F5A6]/35 text-[#10F5A6]',
        }
      : user.kyc_status === 'needs_reverification'
        ? {
            label: 'مطلوب إعادة التوثيق',
            cls: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
          }
        : user.kyc_status === 'pending'
          ? {
              label: 'توثيق قيد المراجعة',
              cls: 'bg-amber-500/15 border-amber-400/35 text-amber-300',
            }
          : {
              label: 'غير موثق',
              cls: 'bg-sky-500/15 border-sky-400/35 text-sky-300',
            };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Executive Profile Header */}
      <div className="tl-rate-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] ring-2 ring-emerald-400/35 flex items-center justify-center text-white shadow-xl shrink-0">
              <UserIcon className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{user.full_name}</span>
                {user.kyc_status === 'verified' && (
                  <CheckCircle2 className="w-4 h-4 text-[#10F5A6] shrink-0" />
                )}
              </h1>
              <p dir="ltr" className="text-xs text-slate-200 font-mono text-right mt-0.5">
                +{user.phone}
              </p>
              {user.city_area && (
                <p className="text-xs text-sky-200 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#10F5A6]" />
                  <span>{user.city_area}</span>
                </p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </div>

        {/* Profile Stats Bar */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/15 text-center">
          <div className="rounded-2xl bg-[#071124]/70 p-2.5">
            <div className="text-[11px] text-slate-400">إجمالي التداول</div>
            <div className="text-sm sm:text-base font-extrabold text-[#10F5A6] tabular-nums mt-0.5">
              {Number(user.total_volume_usdt).toFixed(2)} USDT
            </div>
          </div>
          <div className="rounded-2xl bg-[#071124]/70 p-2.5">
            <div className="text-[11px] text-slate-400">العمليات</div>
            <div className="text-sm sm:text-base font-extrabold text-white tabular-nums mt-0.5">
              {stats.completedCount} / {stats.ordersCount}
            </div>
          </div>
          <div className="rounded-2xl bg-[#071124]/70 p-2.5">
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>تاريخ التسجيل</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums mt-1">
              {joined}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback alerts */}
      {msg && (
        <div className="rounded-2xl bg-emerald-500/15 border border-[#10F5A6]/40 px-4 py-3 text-xs text-[#10F5A6] font-bold">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 text-xs text-rose-200 font-bold">
          {err}
        </div>
      )}

      {/* Re-verification Alert Banner if flagged by Admin */}
      {user.kyc_status === 'needs_reverification' && (
        <div className="rounded-3xl bg-rose-950/50 border border-rose-400/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>مطلوب إعادة توثيق المستندات</span>
          </div>
          <p className="text-xs text-rose-100 leading-relaxed">
            {user.kyc_note ||
              'يرجى إعادة رفع صورة واضحة لجواز السفر وشهادة الميلاد والتأكد من تطابق الاسم واللقب.'}
          </p>
        </div>
      )}

      {/* Identity Verification & Documents Card */}
      <form onSubmit={handleResubmitKyc} className="tl-glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-[#10F5A6]" />
            <span>وثائق التحقق والهوية (جواز السفر وشهادة الميلاد)</span>
          </h2>
          {user.kyc_status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>قيد التدقيق</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Passport Doc Box */}
          <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">جواز السفر</span>
              {passportUrl ? (
                <a
                  href={passportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>عرض المستند</span>
                </a>
              ) : (
                <span className="text-rose-300 text-[11px]">غير مرفق</span>
              )}
            </div>

            {user.kyc_status !== 'verified' && (
              <label className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-[11px] text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#10F5A6]/50 transition">
                {uploadingPassport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10F5A6]" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>{passportUrl ? 'تحديث صورة جواز السفر' : 'رفع جواز السفر'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleUploadDoc('passport', e)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Birth Certificate Doc Box */}
          <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">شهادة الميلاد</span>
              {birthCertUrl ? (
                <a
                  href={birthCertUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>عرض المستند</span>
                </a>
              ) : (
                <span className="text-rose-300 text-[11px]">غير مرفق</span>
              )}
            </div>

            {user.kyc_status !== 'verified' && (
              <label className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-[11px] text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:border-[#10F5A6]/50 transition">
                {uploadingBirth ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10F5A6]" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>{birthCertUrl ? 'تحديث شهادة الميلاد' : 'رفع شهادة الميلاد'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleUploadDoc('birth', e)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {user.kyc_status !== 'verified' && (
          <button
            type="submit"
            disabled={resubmittingKyc || uploadingPassport || uploadingBirth}
            className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-[#10F5A6]/40 text-[#10F5A6] font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 disabled:opacity-50 transition"
          >
            {resubmittingKyc ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            <span>
              {user.kyc_status === 'needs_reverification'
                ? 'إعادة إرسال المستندات للتوثيق'
                : 'إرسال / تحديث طلب توثيق الهوية'}
            </span>
          </button>
        )}
      </form>

      {/* Edit Profile Info */}
      <form onSubmit={handleSave} className="tl-glass-card rounded-3xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">البيانات الشخصية ومحل الإقامة</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">الاسم الأول</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">اللقب</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">مكان السكن في ليبيا</label>
            <input
              type="text"
              required
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
              placeholder="المدينة — المنطقة"
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white text-left focus:outline-none focus:border-[#10F5A6]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </form>

      {/* Account Actions & Links */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-2.5">
        <Link
          href="/orders"
          className="w-full py-3 px-4 rounded-xl bg-[#071124] border border-white/10 text-sm font-bold text-white flex items-center justify-between hover:border-emerald-400/40 transition"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>سجل العمليات والطلبات</span>
          </span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/notifications"
          className="w-full py-3 px-4 rounded-xl bg-[#071124] border border-white/10 text-sm font-bold text-white flex items-center justify-between hover:border-emerald-400/40 transition"
        >
          <span className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#10F5A6]" />
            <span>إعدادات الإشعارات الفورية (Web Push)</span>
          </span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/contact"
          className="w-full py-3 px-4 rounded-xl bg-[#071124] border border-white/10 text-sm font-bold text-white flex items-center justify-between hover:border-emerald-400/40 transition"
        >
          <span className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-sky-400" />
            <span>تواصل مع الدعم الفني</span>
          </span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </Link>

        <div className="rounded-xl bg-[#071124]/60 border border-white/10 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10F5A6]" />
            <span>حالة الموافقة على الشروط والأحكام والامتثال</span>
          </span>
          <span className="text-[#10F5A6] font-bold">
            {user.terms_accepted_at ? 'موافق ✓' : 'معلق'}
          </span>
        </div>

        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={installApp}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 text-sm font-bold text-[#10F5A6] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت تطبيق تيتر ليبيا</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-xl bg-rose-500/15 border border-rose-400/35 text-sm font-bold text-rose-300 flex items-center justify-center gap-2 hover:bg-rose-500/20 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
