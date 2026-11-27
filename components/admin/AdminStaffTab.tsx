'use client';

import React, { useState } from 'react';
import {
  Check,
  Edit3,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  Users2,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import {
  ADMIN_PERMISSION_LABELS,
  type AdminPermission,
  STAFF_ASSIGNABLE_PERMISSIONS,
  STAFF_ROLE_DEFAULT_PERMISSIONS,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from '@/lib/types';

export interface StaffAccountSummary {
  id: string;
  full_name: string;
  username: string;
  role: StaffRole;
  permissions_json: AdminPermission[];
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

const ROLE_OPTIONS: StaffRole[] = ['support', 'finance', 'marketing', 'manager'];

export function AdminStaffTab({
  staffList,
  onReload,
}: {
  staffList: StaffAccountSummary[];
  onReload: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    STAFF_ROLE_DEFAULT_PERMISSIONS.support
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>('support');
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleRoleChange = (nextRole: StaffRole) => {
    setRole(nextRole);
    setPermissions([...STAFF_ROLE_DEFAULT_PERMISSIONS[nextRole]]);
  };

  const togglePermission = (
    list: AdminPermission[],
    setter: React.Dispatch<React.SetStateAction<AdminPermission[]>>,
    perm: AdminPermission
  ) => {
    setter(list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm]);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
          role,
          permissions,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر إنشاء حساب الموظف');
        return;
      }
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('support');
      setPermissions([...STAFF_ROLE_DEFAULT_PERMISSIONS.support]);
      setFeedback('تم إنشاء حساب الموظف وتحديد صلاحياته بنجاح.');
      onReload();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (s: StaffAccountSummary) => {
    setEditingId(s.id);
    setEditFullName(s.full_name);
    setEditRole(s.role);
    setEditPermissions([...s.permissions_json]);
    setEditPassword('');
    setConfirmDeleteId(null);
    setError('');
    setFeedback('');
  };

  const handleSaveEdit = async (id: string) => {
    setError('');
    setFeedback('');
    const res = await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        full_name: editFullName,
        role: editRole,
        permissions: editPermissions,
        ...(editPassword.trim() ? { newPassword: editPassword.trim() } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error || 'تعذر تحديث حساب الموظف');
      return;
    }
    setEditingId(null);
    setEditPassword('');
    setFeedback('تم حفظ تعديلات الموظف بنجاح.');
    onReload();
  };

  const handleToggleActive = async (s: StaffAccountSummary) => {
    setError('');
    setFeedback('');
    const res = await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
    if (res.ok) {
      setFeedback(
        s.is_active
          ? `تم إيقاف حساب "${s.full_name}" وإنهاء جلساته النشطة.`
          : `تم إعادة تفعيل حساب "${s.full_name}".`
      );
      onReload();
    }
  };

  const handleDeleteStaff = async (id: string) => {
    setError('');
    setFeedback('');
    const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      setFeedback('تم حذف حساب الموظف نهائياً.');
      onReload();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'تعذر حذف الموظف');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[#10F5A6]" />
            <span>إدارة طاقم العمل والأدوار الوظيفية</span>
          </h2>
          <p className="text-xs text-slate-400">
            حسابات العملاء المسجلين في التطبيق معزولة تماماً ولا يمكن ترقيتها. أنشئ هنا حسابات الدعم الفني، المراجعة المالية، أو التسويق بصلاحيات محددة عبر الخادم.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-[#10F5A6]/25 text-xs text-[#10F5A6] font-bold">
          {staffList.filter((s) => s.is_active).length} موظف نشط من أصل {staffList.length}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 text-xs text-rose-200 font-semibold">
          {error}
        </div>
      )}
      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 px-4 py-3 text-xs text-[#10F5A6] font-semibold">
          {feedback}
        </div>
      )}

      {/* Create New Staff Form */}
      <form
        onSubmit={handleCreateStaff}
        className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-4"
      >
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#10F5A6]" />
          <span>إضافة عضو طاقم جديد</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">الاسم الكامل</label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد علي"
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">اسم المستخدم (إنجليزي)</label>
            <input
              type="text"
              required
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ahmad_support"
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white text-left font-mono focus:outline-none focus:border-[#10F5A6]"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">الدور الوظيفي</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">كلمة المرور (8 أحرف فأكثر)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">
            الصلاحيات المسموح بها لهذا الحساب (لا تشمل إدارة الطاقم):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {STAFF_ASSIGNABLE_PERMISSIONS.map((perm) => {
              const checked = permissions.includes(perm);
              return (
                <button
                  key={perm}
                  type="button"
                  onClick={() => togglePermission(permissions, setPermissions, perm)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition ${
                    checked
                      ? 'bg-emerald-500/15 border-[#10F5A6]/40 text-[#10F5A6]'
                      : 'bg-[#040B1A] border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  <span className="truncate">{ADMIN_PERMISSION_LABELS[perm]}</span>
                  {checked && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || permissions.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#10F5A6] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-2 disabled:opacity-50 transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>إنشاء حساب الموظف</span>
          </button>
        </div>
      </form>

      {/* Staff List */}
      <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white">طاقم العمل المسجّل ({staffList.length})</h3>

        {staffList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            لم تقم بإضافة أي موظفين أو مشرفين بعد. المدير العام يمتلك السيطرة الكاملة حالياً.
          </p>
        ) : (
          <div className="space-y-3">
            {staffList.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl bg-[#040B1A] border border-white/10 p-4 text-xs space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-white">{s.full_name}</span>
                      <span
                        dir="ltr"
                        className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/5 text-slate-300"
                      >
                        @{s.username}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-bold text-[11px]">
                        {STAFF_ROLE_LABELS[s.role]}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          s.is_active
                            ? 'bg-emerald-500/15 text-[#10F5A6]'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {s.is_active ? 'نشط' : 'موقوف'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.permissions_json.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded bg-[#0B1730] border border-white/10 text-[10px] text-slate-300"
                        >
                          {ADMIN_PERMISSION_LABELS[perm]}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 tabular-nums">
                      آخر دخول: {s.last_login_at ? formatTripoliDateTime(s.last_login_at) : 'لم يسجل دخولاً بعد'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => (editingId === s.id ? setEditingId(null) : startEditing(s))}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 font-bold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الصلاحيات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 ${
                        s.is_active
                          ? 'bg-amber-500/15 border border-amber-400/30 text-amber-300'
                          : 'bg-emerald-500/15 border border-emerald-400/30 text-[#10F5A6]'
                      }`}
                    >
                      {s.is_active ? (
                        <UserMinus className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>{s.is_active ? 'إيقاف مؤقت' : 'تفعيل'}</span>
                    </button>

                    {confirmDeleteId === s.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-extrabold"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 font-bold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>

                {editingId === s.id && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">الاسم الكامل</label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full rounded-xl bg-[#081226] border border-white/15 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">الدور الوظيفي</label>
                        <select
                          value={editRole}
                          onChange={(e) => {
                            const r = e.target.value as StaffRole;
                            setEditRole(r);
                            setEditPermissions([...STAFF_ROLE_DEFAULT_PERMISSIONS[r]]);
                          }}
                          className="w-full rounded-xl bg-[#081226] border border-white/15 px-3 py-2 text-white"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {STAFF_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">كلمة مرور جديدة (اختياري)</label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="اتركه فارغاً للإبقاء على الحالية"
                            className="w-full rounded-xl bg-[#081226] border border-white/15 pr-8 pl-3 py-2 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {STAFF_ASSIGNABLE_PERMISSIONS.map((perm) => {
                        const checked = editPermissions.includes(perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            onClick={() =>
                              togglePermission(editPermissions, setEditPermissions, perm)
                            }
                            className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1.5 ${
                              checked
                                ? 'bg-emerald-500/15 border-[#10F5A6]/40 text-[#10F5A6]'
                                : 'bg-[#081226] border-white/10 text-slate-400'
                            }`}
                          >
                            <span className="truncate">{ADMIN_PERMISSION_LABELS[perm]}</span>
                            {checked && <ShieldCheck className="w-3 h-3 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(s.id)}
                        disabled={editPermissions.length === 0}
                        className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold disabled:opacity-50"
                      >
                        حفظ التغييرات
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
