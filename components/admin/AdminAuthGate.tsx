'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldAlert, ShieldCheck, UserCog, UserRound } from 'lucide-react';
import type { AdminPermission } from '@/lib/types';

export interface AuthenticatedAdminActor {
  actorId: string;
  actorType: 'super_admin' | 'staff';
  actorName: string;
  actorRole: string;
  permissions: AdminPermission[];
}

export function AdminAuthGate({
  needsFirstRunClaim,
  onAuthenticated,
}: {
  needsFirstRunClaim: boolean;
  onAuthenticated: (actor: AuthenticatedAdminActor) => void;
}) {
  const [mode, setMode] = useState<'super_admin' | 'staff'>('super_admin');
  const [passcode, setPasscode] = useState('');
  const [username, setUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload =
        mode === 'staff' && !needsFirstRunClaim
          ? {
              mode: 'staff' as const,
              username: username.trim().toLowerCase(),
              password: staffPassword,
            }
          : {
              mode: 'super_admin' as const,
              action: needsFirstRunClaim ? ('claim' as const) : ('login' as const),
              passcode,
            };

      const res = await fetch('/api/auth/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        actor?: AuthenticatedAdminActor;
      };
      if (!res.ok || !data.ok || !data.actor) {
        setError(data.error || 'تعذر التحقق من بيانات الدخول');
        return;
      }
      onAuthenticated(data.actor);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 bg-[#040B1A]">
      <div className="w-full max-w-md rounded-3xl bg-[#081226] border border-white/10 p-7 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#10F5A6] font-bold">بوابة الإدارة المستقلة</span>
          <span className="text-xs text-slate-400 font-semibold font-[family-name:var(--font-latin)]">
            Tether Libya Control
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-[#10F5A6]/30 flex items-center justify-center mx-auto text-[#10F5A6]">
            {needsFirstRunClaim ? (
              <ShieldAlert className="w-7 h-7" />
            ) : mode === 'staff' ? (
              <UserCog className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-xl font-extrabold text-white">
            {needsFirstRunClaim
              ? 'تهيئة رمز المدير العام'
              : mode === 'staff'
                ? 'دخول طاقم العمل والمشرفين'
                : 'دخول المدير العام'}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {needsFirstRunClaim
              ? 'لم يتم تعيين رمز الإدارة البيئي بعد. أنشئ كلمة مرور المدير العام لتأمين لوحة التحكم.'
              : mode === 'staff'
                ? 'سجّل الدخول بحساب الموظف الذي أنشأه المدير العام للوصول إلى الصلاحيات الممنوحة لك فقط.'
                : 'أدخل رمز المدير العام المعتمد في إعدادات النظام للتحكم الكامل بالمنصة وإدارة الأدوار.'}
          </p>
        </div>

        {!needsFirstRunClaim && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#040B1A] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('super_admin');
                setError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'super_admin'
                  ? 'bg-[#10F5A6] text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>المدير العام</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('staff');
                setError('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'staff'
                  ? 'bg-[#10F5A6] text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>طاقم العمل</span>
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'staff' && !needsFirstRunClaim ? (
            <>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <UserRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="support_staff"
                    className="w-full rounded-xl bg-[#040B1A] border border-white/15 pr-10 pl-3 py-3 text-sm text-white text-left focus:outline-none focus:border-[#10F5A6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
                  كلمة المرور
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-[#040B1A] border border-white/15 pr-10 pl-3 py-3 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
                {needsFirstRunClaim
                  ? 'تعيين كلمة مرور المدير العام (6 أحرف فأكثر)'
                  : 'رمز الدخول السري للمدير العام'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#040B1A] border border-white/15 pr-10 pl-3 py-3 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#10F5A6] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {needsFirstRunClaim
                ? 'اعتماد والدخول للوحة التحكم'
                : mode === 'staff'
                  ? 'دخول بحساب الموظف'
                  : 'دخول المدير العام'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
