'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Phone, ShieldCheck } from 'lucide-react';

export function LoginClient({
  nextPath,
  appName,
  isHomeGate = false,
}: {
  nextPath: string;
  appName: string;
  isHomeGate?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        phone?: string;
        mode?: string;
        previewCode?: string;
      };
      if (!res.ok) {
        setError(data.error || 'تعذر إرسال رمز التحقق');
        return;
      }
      if (data.phone) setPhone(data.phone);
      setStep('otp');
      if (data.previewCode) {
        setPreviewCode(data.previewCode);
        setInfo('تم توليد رمز التحقق — أدخل الرمز الظاهر أدناه للمتابعة.');
      } else {
        setPreviewCode(null);
        setInfo('تم إرسال رمز التحقق عبر رسالة نصية إلى رقم هاتفك.');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'رمز التحقق غير صحيح');
        return;
      }
      if (nextPath && nextPath !== '/') {
        router.push(nextPath);
      }
      router.refresh();
    } catch {
      setError('تعذر إتمام التحقق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-2 space-y-4">
      <div className="tl-glass-card rounded-3xl p-6 space-y-5">
        <div className="text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-[#10F5A6]/40 flex items-center justify-center mx-auto text-[#10F5A6] shadow-[0_0_24px_rgba(16,245,166,0.18)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-white">
            {isHomeGate ? `أهلاً بك في ${appName}` : `تسجيل الدخول — ${appName}`}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            منصتك المباشرة لشراء وبيع عملة USDT مقابل الدينار عبر التحويلات المصرفية وشبكة TRON بإشراف فوري وموثوق.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 text-xs text-rose-200 font-medium">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 text-xs text-emerald-100 leading-relaxed">
            <p>{info}</p>
            {previewCode && (
              <div
                data-copyable="true"
                className="mt-2 font-mono text-base font-bold text-[#10F5A6] tracking-widest"
              >
                رمز التحقق: {previewCode}
              </div>
            )}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                رقم الهاتف *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0910001234"
                  className="w-full rounded-xl bg-[#071124] border border-white/15 pr-10 pl-3 py-3 text-sm text-white text-left tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-[#10F5A6]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-60 transition shadow-lg"
            >
              <span>{loading ? 'جاري الإرسال...' : 'دخول / تسجيل حساب'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                أدخل رمز التحقق المرسل إلى <span dir="ltr" className="text-[#10F5A6]">{phone}</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  dir="ltr"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-xl bg-[#071124] border border-white/15 pr-10 pl-3 py-3 text-center text-lg font-bold tracking-[0.4em] text-white tabular-nums focus:outline-none focus:border-[#10F5A6]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-sm hover:brightness-105 disabled:opacity-60 transition shadow-lg"
            >
              {loading ? 'جاري التحقق...' : 'تأكيد الدخول'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError('');
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition"
            >
              تغيير رقم الهاتف أو إعادة إرسال الرمز
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px] text-slate-300 text-center">
          <div className="rounded-xl bg-[#071124]/80 p-2 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10F5A6]" />
            <span>شراء وبيع مباشر</span>
          </div>
          <div className="rounded-xl bg-[#071124]/80 p-2 flex flex-col items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>أسعار محدثة</span>
          </div>
          <div className="rounded-xl bg-[#071124]/80 p-2 flex flex-col items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-[#10F5A6]" />
            <span>حماية وموثوقية</span>
          </div>
        </div>
      </div>
    </div>
  );
}
