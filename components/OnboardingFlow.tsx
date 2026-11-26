'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Loader2,
  MapPin,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
} from 'lucide-react';
import type { User } from '@/lib/types';

const LIBYAN_CITIES = [
  'طرابلس',
  'بنغازي',
  'مصراتة',
  'الزاوية',
  'زليتن',
  'البيضاء',
  'طبرق',
  'سبها',
  'الخمس',
  'صبراتة',
  'غريان',
  'أجدابيا',
  'درنة',
  'سرت',
  'المرج',
  'ترهونة',
  'بني وليد',
  'زوارة',
  'يفرن',
  'الجميل',
  'مسلاتة',
  'الكفرة',
  'غدامس',
  'أخرى',
];

export function OnboardingFlow({
  user,
  appName,
}: {
  user: User;
  appName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'terms' | 'kyc'>(
    user.terms_accepted_at ? 'kyc' : 'terms'
  );

  // Terms step
  const [agreed, setAgreed] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  // KYC profile step
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [city, setCity] = useState('طرابلس');
  const [neighborhood, setNeighborhood] = useState('');
  const [passportUrl, setPassportUrl] = useState(user.passport_image_url || '');
  const [birthCertUrl, setBirthCertUrl] = useState(user.birth_cert_image_url || '');
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [uploadingBirth, setUploadingBirth] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [error, setError] = useState('');

  const handleAcceptTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('يرجى قراءة الشروط والأحكام والموافقة عليها للمتابعة.');
      return;
    }
    setError('');
    setTermsLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept_terms: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'تعذر حفظ الموافقة');
        return;
      }
      setStep('kyc');
      router.refresh();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setTermsLoading(false);
    }
  };

  const handleUploadDoc = async (
    kind: 'passport' | 'birth',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (kind === 'passport') setUploadingPassport(true);
    else setUploadingBirth(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'kyc');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'تعذر رفع الصورة، يرجى المحاولة بصورة واضحة');
        return;
      }
      if (kind === 'passport') setPassportUrl(data.url);
      else setBirthCertUrl(data.url);
    } catch {
      setError('حدث خطأ أثناء رفع الملف');
    } finally {
      if (kind === 'passport') setUploadingPassport(false);
      else setUploadingBirth(false);
    }
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError('يرجى إدخال الاسم واللقب بشكل صحيح');
      return;
    }
    if (!passportUrl || !birthCertUrl) {
      setError('يرجى رفع صورة جواز السفر وصورة شهادة الميلاد لاستكمال فتح الحساب');
      return;
    }

    const cityArea = neighborhood.trim()
      ? `${city} — ${neighborhood.trim()}`
      : city;

    setSubmittingKyc(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complete_onboarding: true,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          city_area: cityArea,
          passport_image_url: passportUrl,
          birth_cert_image_url: birthCertUrl,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'تعذر حفظ بيانات التوثيق');
        return;
      }
      router.refresh();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmittingKyc(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-2 space-y-4">
      {/* Progress Indicator */}
      <div className="tl-glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className={`flex items-center gap-2 font-bold ${step === 'terms' ? 'text-[#10F5A6]' : 'text-emerald-300'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
            step === 'terms' ? 'bg-[#10F5A6] text-slate-950' : 'bg-emerald-500/20 text-[#10F5A6]'
          }`}>
            1
          </span>
          <span>الشروط والأحكام وإخلاء المسؤولية</span>
        </div>
        <div className="h-px flex-1 bg-white/10" />
        <div className={`flex items-center gap-2 font-bold ${step === 'kyc' ? 'text-[#10F5A6]' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
            step === 'kyc' ? 'bg-[#10F5A6] text-slate-950' : 'bg-white/10 text-slate-400'
          }`}>
            2
          </span>
          <span>البيانات الشخصية والوثائق</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 text-xs text-rose-200 font-semibold">
          {error}
        </div>
      )}

      {step === 'terms' ? (
        <form onSubmit={handleAcceptTerms} className="tl-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">
                اتفاقية الاستخدام وإخلاء المسؤولية القانونية — {appName}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                يرجى قراءة البنود التالية بعناية قبل استكمال فتح حسابك
              </p>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-4 text-xs text-slate-200 leading-relaxed">
            <section className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>أولاً: إخلاء المسؤولية التامة عن الاستخدام غير المشروع</span>
              </h2>
              <p>
                تخلي منصة {appName} وإدارتها ومشغلوها مسؤوليتهم القانونية والمالية والجزائية التامة عن أي تصرف غير لائق أو استخدام غير قانوني أو مشبوه للأموال المحوّلة أو الأصول الرقمية (USDT) المشتراة أو المباعة عبر المنصة. يقر المستخدم إقراراً صريحاً غير قابل للنقض بأن المنصة تقتصر مهمتها على الوساطة والتنفيذ الفني المباشر للطلبات، ولا تتحمل أي تبعات ناتجة عن وجهة الأموال أو طبيعة التعاملات التي يجريها العميل مع أطراف ثالثة.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>ثانياً: الرقابة المالية ومكافحة غسل الأموال (AML / CFT)</span>
              </h2>
              <p>
                تخضع جميع العمليات والتحويلات المصرفية والرقمية للرقابة والتدقيق والفحص المستمر وفق سياسات الامتثال الصارمة لمكافحة غسل الأموال وتمويل الأنشطة غير المشروعة والاحتيال المالي. يُمنع منعاً باتاً استخدام المنصة لغسل الأموال أو تمرير أموال ناتجة عن سرقة أو احتيال أو ابتزاز أو أي نشاط مخالف للقوانين المحلية والدولية. تحتفظ الإدارة بالحق الكامل في تعليق أي عملية مشبوهة، وطلب مستندات إضافية لإثبات مصدر الأموال، وتزويد الجهات الرقابية والقضائية المختصة بكافة البيانات وسجلات التحويل عند الاشتباه أو وجود مطالبة رسمية.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-[#10F5A6]">
                ثالثاً: ملكية الحسابات ومطابقة الهوية
              </h2>
              <p>
                يلتزم المستخدم بأن تكون جميع الحوالات المصرفية الواردة والصادرة (LYPay / OnePay / المصارف المحلية) من وإلى حسابات مصرفية تعود له شخصياً ومطابقة لبيانات جواز سفره وشهادة ميلاده المسجلة في المنصة. يُحظر تماماً الدفع أو الاستلام عبر حسابات لأطراف ثالثة مجهولة أو شركات غير مخولة، وفي حال مخالفة ذلك يحق للإدارة رفض الطلب أو تجميده لحين استيفاء التحقق القانوني.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-sky-300">
                رابعاً: نهائية التحويلات على شبكة البلوكشين (TRON TRC20)
              </h2>
              <p>
                يتحمل المستخدم المسؤولية الكاملة عن مراجعة عنوان المحفظة الرقمية (TRON TRC20) والتأكد من دقته قبل إرسال أي طلب. إن التحويلات المنفذة على البلوكشين نهائية ولا يمكن التراجع عنها أو استرجاعها بأي شكل من الأشكال، ولا تتحمل المنصة أي خسارة ناتجة عن إدخال عنوان خاطئ أو اختيار شبكة غير متوافقة.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-extrabold text-white">
                خامساً: التحقق من الوثائق وإعادة التوثيق
              </h2>
              <p>
                يتم فتح الحساب للمستخدم مباشرة بعد استكمال بياناته، وتخضع الوثائق المرفوعة (جواز السفر وشهادة الميلاد) للمراجعة والتدقيق من فريق الامتثال. في حال تبين أن أياً من الصور غير واضح أو غير صحيح أو غير مطابق، يحق للإدارة إرسال إشعار رسمي بإعادة التوثيق وتقييد المزايا أو العمليات حتى تصحيح الوثائق.
              </p>
            </section>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-[#071124] border border-emerald-400/25 p-3.5 cursor-pointer hover:border-emerald-400/45 transition">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#10F5A6] shrink-0"
            />
            <span className="text-xs text-slate-100 leading-relaxed font-semibold">
              أقرّ بأنني قرأت كافة الشروط والأحكام وبنود إخلاء المسؤولية ومراقبة التحويلات ومكافحة غسل الأموال، وأوافق عليها وأتحمل المسؤولية القانونية الكاملة عن جميع معاملاتي.
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed || termsLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg"
          >
            {termsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>أوافق على الشروط — المتابعة</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitKyc} className="tl-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-[#10F5A6]/35 flex items-center justify-center text-[#10F5A6] shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">استكمال البيانات الشخصية والتوثيق</h1>
              <p className="text-xs text-slate-300 mt-0.5">
                أدخل بياناتك الحقيقية وأرفق الوثائق المطلوبة ليتم فتح حسابك فوراً
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">الاسم الأول *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="مثال: محمد"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">اللقب / اسم العائلة *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="مثال: الزنتاني"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#10F5A6]" />
                <span>المدينة *</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              >
                {LIBYAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                المنطقة / الحي (اختياري)
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="مثال: قرجي / حي الأندلس / السلماني"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Passport upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                صورة جواز السفر (واضحة) *
              </label>
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/35 bg-[#071124]/70 p-4 cursor-pointer hover:border-[#10F5A6] transition min-h-[120px] text-center">
                {uploadingPassport ? (
                  <div className="flex items-center gap-2 text-xs text-[#10F5A6]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري رفع جواز السفر...</span>
                  </div>
                ) : passportUrl ? (
                  <div className="space-y-1 text-[#10F5A6]">
                    <FileCheck className="w-6 h-6 mx-auto" />
                    <p className="text-xs font-bold">تم رفع صورة جواز السفر</p>
                    <p className="text-[10px] text-slate-400">اضغط للاستبدال</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-slate-300">
                    <Upload className="w-6 h-6 mx-auto text-sky-400" />
                    <span className="text-xs font-semibold block">اختر صورة جواز السفر</span>
                    <span className="text-[10px] text-slate-500">PNG / JPG / WEBP (حد 5MB)</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleUploadDoc('passport', e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Birth certificate upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                صورة شهادة الميلاد (واضحة) *
              </label>
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/35 bg-[#071124]/70 p-4 cursor-pointer hover:border-[#10F5A6] transition min-h-[120px] text-center">
                {uploadingBirth ? (
                  <div className="flex items-center gap-2 text-xs text-[#10F5A6]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري رفع شهادة الميلاد...</span>
                  </div>
                ) : birthCertUrl ? (
                  <div className="space-y-1 text-[#10F5A6]">
                    <FileCheck className="w-6 h-6 mx-auto" />
                    <p className="text-xs font-bold">تم رفع صورة شهادة الميلاد</p>
                    <p className="text-[10px] text-slate-400">اضغط للاستبدال</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-slate-300">
                    <Upload className="w-6 h-6 mx-auto text-sky-400" />
                    <span className="text-xs font-semibold block">اختر صورة شهادة الميلاد</span>
                    <span className="text-[10px] text-slate-500">PNG / JPG / WEBP (حد 5MB)</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleUploadDoc('birth', e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-[#071124] border border-white/10 p-3 flex items-center gap-2 text-[11px] text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-[#10F5A6] shrink-0" />
            <span>
              سيتم فتح حسابك فوراً بعد إرسال البيانات، وسيراجع فريق الامتثال المستندات لتفعيل شارة التوثيق الكامل.
            </span>
          </div>

          <button
            type="submit"
            disabled={submittingKyc || uploadingPassport || uploadingBirth}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg"
          >
            {submittingKyc ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري فتح الحساب...</span>
              </>
            ) : (
              <span>إكمال التسجيل والدخول للمنصة</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
