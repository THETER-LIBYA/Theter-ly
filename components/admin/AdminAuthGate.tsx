'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';

export function AdminAuthGate({
  needsFirstRunClaim,
  onAuthenticated,
}: {
  needsFirstRunClaim: boolean;
  onAuthenticated: () => void;
}) {
  const [passcode, setPasscode] = useState('');
  const [adminName, setAdminName] = useState('المدير العام — تيتر ليبيا');
  const [adminPhone, setAdminPhone] = useState('218910000001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: needsFirstRunClaim ? 'claim' : 'login',
          passcode,
          adminName,
          adminPhone,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر التحقق من بيانات الإدارة');
        return;
      }
      onAuthenticated();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md tl-glass-card rounded-3xl p-7 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#10F5A6] font-bold">بوابة الإدارة المستقلة</span>
          <span className="text-xs text-slate-400 font-semibold font-[family-name:var(--font-latin)]">Tether Libya Admin</span>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center mx-auto text-sky-400">
            {needsFirstRunClaim ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-extrabold text-white">
            {needsFirstRunClaim ? 'تهيئة رمز المشرف الأول' : 'لوحة التحكم الإدارية'}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            {needsFirstRunClaim
              ? 'لم يتم تعيين رمز إدارة في متغيرات البيئة بعد. قم بإنشاء كلمة مرور المشرف الأول لتأمين لوحة التحكم.'
              : 'أدخل رمز الإدارة المصرح به للدخول إلى مركز السيطرة الكامل.'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {needsFirstRunClaim && (
            <>
              <div>
                <label className="block text-xs text-slate-300 mb-1">اسم المشرف الرئيسي</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">رقم هاتف المشرف (لاستلام تنبيهات الطلبات)</label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white text-left font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              {needsFirstRunClaim ? 'تعيين كلمة مرور الإدارة (6 أحرف فأكثر)' : 'كلمة مرور الإدارة'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#071124] border border-white/15 pr-10 pl-3 py-3 text-sm text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{needsFirstRunClaim ? 'حفظ والدخول للوحة الإدارة' : 'دخول لوحة الإدارة'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
