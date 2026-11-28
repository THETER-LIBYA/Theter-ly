'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Edit3,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserMinus,
  Users2,
  X,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_PERMISSIONS_DIRECTORY,
  type AdminPermission,
  type AdminRoleDefinition,
  ALL_ADMIN_PERMISSIONS,
  STAFF_ASSIGNABLE_PERMISSIONS,
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

export interface RoleSummary extends AdminRoleDefinition {
  staffCount?: number;
}

export function AdminStaffTab({
  staffList,
  roles,
  onReload,
}: {
  staffList: StaffAccountSummary[];
  roles: RoleSummary[];
  onReload: () => void;
}) {
  const totalPlatformPermissions = ALL_ADMIN_PERMISSIONS.length;

  // Custom role creation & editing state
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<AdminPermission[]>(['overview', 'orders']);
  const [savingRole, setSavingRole] = useState(false);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRolePerms, setEditRolePerms] = useState<AdminPermission[]>([]);
  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(null);

  // Staff creation & editing state
  const defaultRoleSlug = roles[0]?.slug || 'support';
  const defaultRolePerms = roles[0]?.permissions_json || ['overview', 'support', 'users'];

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>(defaultRoleSlug);
  const [permissions, setPermissions] = useState<AdminPermission[]>(defaultRolePerms);
  const [submittingStaff, setSubmittingStaff] = useState(false);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffRole, setEditStaffRole] = useState<StaffRole>(defaultRoleSlug);
  const [editStaffPermissions, setEditStaffPermissions] = useState<AdminPermission[]>([]);
  const [editStaffFullName, setEditStaffFullName] = useState('');
  const [editStaffPassword, setEditStaffPassword] = useState('');
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const roleMap = new Map(roles.map((r) => [r.slug, r]));

  const resolveRoleName = (slug: string) =>
    roleMap.get(slug)?.name_ar || STAFF_ROLE_LABELS[slug] || slug;

  const togglePermission = (
    list: AdminPermission[],
    setter: React.Dispatch<React.SetStateAction<AdminPermission[]>>,
    perm: AdminPermission
  ) => {
    setter(list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm]);
  };

  // --- Role CRUD Handlers ---
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSavingRole(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_ar: newRoleName,
          description_ar: newRoleDesc,
          permissions: newRolePerms,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر إنشاء الدور المخصص');
        return;
      }
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRolePerms(['overview', 'orders']);
      setShowCreateRole(false);
      setFeedback('تم إنشاء الدور المخصص وإضافته لمصفوفة الصلاحيات بنجاح.');
      onReload();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSavingRole(false);
    }
  };

  const openRoleEditor = (r: RoleSummary) => {
    setEditingRoleId(r.id);
    setEditRoleName(r.name_ar);
    setEditRoleDesc(r.description_ar);
    setEditRolePerms([...r.permissions_json]);
    setConfirmDeleteRoleId(null);
    setShowCreateRole(false);
    setError('');
    setFeedback('');
  };

  const handleSaveRoleEdit = async (id: string) => {
    setError('');
    setFeedback('');
    setSavingRole(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name_ar: editRoleName,
          description_ar: editRoleDesc,
          permissions: editRolePerms,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر تحديث صلاحيات الدور');
        return;
      }
      setEditingRoleId(null);
      setFeedback('تم تحديث مصفوفة الصلاحيات للدور ومزامنتها مع كافة الموظفين المرتبطين به.');
      onReload();
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    setError('');
    setFeedback('');
    const res = await fetch(`/api/admin/roles?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) {
      setConfirmDeleteRoleId(null);
      setEditingRoleId(null);
      setFeedback('تم حذف الدور المخصص بنجاح.');
      onReload();
    } else {
      setError(data.error || 'تعذر حذف الدور');
    }
  };

  // --- Staff CRUD Handlers ---
  const handleStaffRoleSelect = (nextSlug: string) => {
    setRole(nextSlug);
    const r = roleMap.get(nextSlug);
    if (r) {
      setPermissions([...r.permissions_json]);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSubmittingStaff(true);
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
      setRole(defaultRoleSlug);
      setPermissions([...defaultRolePerms]);
      setFeedback('تم إنشاء حساب الموظف وربطه بالدور الوظيفي بنجاح.');
      onReload();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmittingStaff(false);
    }
  };

  const startEditingStaff = (s: StaffAccountSummary) => {
    setEditingStaffId(s.id);
    setEditStaffFullName(s.full_name);
    setEditStaffRole(s.role);
    setEditStaffPermissions([...s.permissions_json]);
    setEditStaffPassword('');
    setConfirmDeleteStaffId(null);
    setError('');
    setFeedback('');
  };

  const handleSaveStaffEdit = async (id: string) => {
    setError('');
    setFeedback('');
    const res = await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        full_name: editStaffFullName,
        role: editStaffRole,
        permissions: editStaffPermissions,
        ...(editStaffPassword.trim() ? { newPassword: editStaffPassword.trim() } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error || 'تعذر تحديث حساب الموظف');
      return;
    }
    setEditingStaffId(null);
    setEditStaffPassword('');
    setFeedback('تم حفظ تعديلات الموظف بنجاح.');
    onReload();
  };

  const handleToggleStaffActive = async (s: StaffAccountSummary) => {
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
          ? `تم إيقاف حساب "${s.full_name}" وإنهاء جلساته النشطة فوراً.`
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
      setConfirmDeleteStaffId(null);
      setFeedback('تم حذف حساب الموظف نهائياً.');
      onReload();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'تعذر حذف الموظف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Custom Role Button */}
      <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#10F5A6]" />
            <span>إدارة الأدوار ومصفوفة الصلاحيات (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-400">
            تحكم احترافي في أدوار المالك، Admin، Finance، Support، Moderator، Editor، مع إمكانية إنشاء أدوار مخصصة وعزل كامل لحسابات العملاء.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateRole((v) => !v);
            setEditingRoleId(null);
            setError('');
          }}
          className="px-4 py-2.5 rounded-xl bg-[#10F5A6] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-2 transition shrink-0"
        >
          {showCreateRole ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreateRole ? 'إغلاق النموذج' : 'إنشاء دور مخصص (Custom Role)'}</span>
        </button>
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

      {/* Create Custom Role Panel */}
      {showCreateRole && (
        <form
          onSubmit={handleCreateCustomRole}
          className="rounded-2xl bg-[#081226] border border-[#10F5A6]/35 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-white">إنشاء دور وظيفي مخصص جديد</h3>
            <span className="text-[11px] text-[#10F5A6] font-bold">
              {newRolePerms.length} من {totalPlatformPermissions} صلاحيات مختارة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">اسم الدور (عربي / توصيفي) *</label>
              <input
                type="text"
                required
                minLength={2}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="مثال: مراقب جودة العمليات"
                className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">وصف مختصر للدور</label>
              <input
                type="text"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="مثال: مراجعة الإيصالات ومتابعة تذاكر العملاء دون تعديل الأسعار"
                className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ADMIN_PERMISSIONS_DIRECTORY.filter((d) =>
              STAFF_ASSIGNABLE_PERMISSIONS.includes(d.key)
            ).map((item) => {
              const checked = newRolePerms.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => togglePermission(newRolePerms, setNewRolePerms, item.key)}
                  className={`p-3 rounded-xl border text-right transition space-y-1 ${
                    checked
                      ? 'bg-emerald-500/15 border-[#10F5A6]/45 text-white'
                      : 'bg-[#040B1A] border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className={checked ? 'text-[#10F5A6]' : 'text-slate-200'}>
                      {item.title}
                    </span>
                    {checked && <Check className="w-3.5 h-3.5 text-[#10F5A6] shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{item.description}</div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateRole(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={savingRole || newRolePerms.length === 0}
              className="px-5 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>حفظ الدور المخصص</span>
            </button>
          </div>
        </form>
      )}

      {/* Role Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Protected Owner / Super Admin Card */}
        <div className="rounded-2xl bg-[#081226] border border-[#10F5A6]/35 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">المالك (Owner / Super Admin)</h3>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-[#10F5A6] text-[11px] font-bold">
                1 حساب رئيسي
              </span>
            </div>
            <div className="text-xs text-slate-400">
              الصلاحيات الممنوحة:{' '}
              <span className="text-[#10F5A6] font-extrabold">
                كاملة ({totalPlatformPermissions} من {totalPlatformPermissions})
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#040B1A] border border-white/10 rounded-xl px-3 py-2.5">
              تحكم كلي ومطلق في المنصة بدون قيود، ويقتصر الدخول عليه عبر رمز الإدارة البيئي (`ADMIN_PASSCODE`).
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Lock className="w-3.5 h-3.5 text-[#10F5A6]" />
            <span>دور سيادي محمي لا يمكن تقليص صلاحياته</span>
          </div>
        </div>

        {/* Dynamic & System Role Cards */}
        {roles.map((r) => {
          const staffCount =
            typeof r.staffCount === 'number'
              ? r.staffCount
              : staffList.filter((s) => s.role === r.slug).length;
          const visiblePerms = r.permissions_json.slice(0, 4);
          const extraCount = Math.max(0, r.permissions_json.length - visiblePerms.length);
          const isEditingThis = editingRoleId === r.id;

          return (
            <div
              key={r.id}
              className={`rounded-2xl bg-[#081226] border p-5 flex flex-col justify-between space-y-4 ${
                isEditingThis ? 'border-sky-400/50 md:col-span-2 xl:col-span-3' : 'border-white/10'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{r.name_ar}</h3>
                    {r.description_ar && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.description_ar}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-200 font-bold shrink-0">
                    {staffCount} موظف
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  الصلاحيات الممنوحة:{' '}
                  <span className="text-sky-300 font-extrabold">
                    {r.permissions_json.length} من {totalPlatformPermissions}
                  </span>
                </div>

                {!isEditingThis && (
                  <div className="space-y-1.5 bg-[#040B1A] border border-white/5 rounded-xl p-3">
                    {visiblePerms.map((perm) => (
                      <div key={perm} className="flex items-center gap-1.5 text-xs text-slate-200">
                        <Check className="w-3.5 h-3.5 text-[#10F5A6] shrink-0" />
                        <span className="truncate">{ADMIN_PERMISSION_LABELS[perm]}</span>
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="text-[11px] text-[#10F5A6] font-bold pt-0.5">
                        +{extraCount} المزيد
                      </div>
                    )}
                  </div>
                )}

                {isEditingThis && (
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">اسم الدور</label>
                        <input
                          type="text"
                          value={editRoleName}
                          onChange={(e) => setEditRoleName(e.target.value)}
                          className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">وصف الدور</label>
                        <input
                          type="text"
                          value={editRoleDesc}
                          onChange={(e) => setEditRoleDesc(e.target.value)}
                          className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ADMIN_PERMISSIONS_DIRECTORY.filter((d) =>
                        STAFF_ASSIGNABLE_PERMISSIONS.includes(d.key)
                      ).map((item) => {
                        const checked = editRolePerms.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                              togglePermission(editRolePerms, setEditRolePerms, item.key)
                            }
                            className={`p-3 rounded-xl border text-right transition space-y-1 ${
                              checked
                                ? 'bg-emerald-500/15 border-[#10F5A6]/45 text-white'
                                : 'bg-[#040B1A] border-white/10 text-slate-400 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                              <span className={checked ? 'text-[#10F5A6]' : 'text-slate-200'}>
                                {item.title}
                              </span>
                              {checked && <Check className="w-3.5 h-3.5 text-[#10F5A6] shrink-0" />}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {item.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {!r.is_system && staffCount === 0 && (
                          confirmDeleteRoleId === r.id ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(r.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold"
                              >
                                تأكيد حذف الدور
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRoleId(null)}
                                className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 text-xs"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRoleId(r.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-bold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف الدور المخصص</span>
                            </button>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRoleId(null)}
                          className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          disabled={savingRole || editRolePerms.length === 0}
                          onClick={() => handleSaveRoleEdit(r.id)}
                          className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 text-xs font-extrabold disabled:opacity-50"
                        >
                          حفظ وتطبيق الصلاحيات
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isEditingThis && (
                <button
                  type="button"
                  onClick={() => openRoleEditor(r)}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-300" />
                  <span>تعديل الصلاحيات</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Assign Staff Accounts Section */}
      <form
        onSubmit={handleCreateStaff}
        className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#10F5A6]" />
            <span>تعيين عضو طاقم عمل جديد</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            يُمنح الموظف صلاحيات الدور المحدد تلقائياً مع إمكانية التخصيص
          </span>
        </div>

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
              onChange={(e) => handleStaffRoleSelect(e.target.value)}
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-[#10F5A6]"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name_ar}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {STAFF_ASSIGNABLE_PERMISSIONS.map((perm) => {
            const checked = permissions.includes(perm);
            return (
              <button
                key={perm}
                type="button"
                onClick={() => togglePermission(permissions, setPermissions, perm)}
                className={`px-3 py-2 rounded-xl border text-[11px] font-semibold flex items-center justify-between gap-2 transition ${
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submittingStaff || permissions.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#10F5A6] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs inline-flex items-center gap-2 disabled:opacity-50 transition"
          >
            {submittingStaff ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>إنشاء حساب الموظف</span>
          </button>
        </div>
      </form>

      {/* Active Staff List */}
      <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white">
          حسابات طاقم العمل المعيّنة ({staffList.length})
        </h3>

        {staffList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            لا يوجد موظفون معيّنون حالياً. يمكنك إنشاء حساب موظف جديد وربطه بأي دور من الأعلى.
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
                        {resolveRoleName(s.role)}
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
                          className="px-2 py-0.5 rounded bg-[#081226] border border-white/10 text-[10px] text-slate-300"
                        >
                          {ADMIN_PERMISSION_LABELS[perm]}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 tabular-nums">
                      آخر دخول:{' '}
                      {s.last_login_at ? formatTripoliDateTime(s.last_login_at) : 'لم يسجل دخولاً بعد'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        editingStaffId === s.id ? setEditingStaffId(null) : startEditingStaff(s)
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 font-bold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الحساب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStaffActive(s)}
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

                    {confirmDeleteStaffId === s.id ? (
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
                          onClick={() => setConfirmDeleteStaffId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStaffId(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 font-bold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>

                {editingStaffId === s.id && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">الاسم الكامل</label>
                        <input
                          type="text"
                          value={editStaffFullName}
                          onChange={(e) => setEditStaffFullName(e.target.value)}
                          className="w-full rounded-xl bg-[#081226] border border-white/15 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">الدور الوظيفي</label>
                        <select
                          value={editStaffRole}
                          onChange={(e) => {
                            const slug = e.target.value;
                            setEditStaffRole(slug);
                            const matched = roleMap.get(slug);
                            if (matched) setEditStaffPermissions([...matched.permissions_json]);
                          }}
                          className="w-full rounded-xl bg-[#081226] border border-white/15 px-3 py-2 text-white"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.slug}>
                              {r.name_ar}
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
                            value={editStaffPassword}
                            onChange={(e) => setEditStaffPassword(e.target.value)}
                            placeholder="اتركه فارغاً للإبقاء على الحالية"
                            className="w-full rounded-xl bg-[#081226] border border-white/15 pr-8 pl-3 py-2 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {STAFF_ASSIGNABLE_PERMISSIONS.map((perm) => {
                        const checked = editStaffPermissions.includes(perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            onClick={() =>
                              togglePermission(editStaffPermissions, setEditStaffPermissions, perm)
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
                        onClick={() => setEditingStaffId(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveStaffEdit(s.id)}
                        disabled={editStaffPermissions.length === 0}
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

      {/* Standard Platform Permissions Directory */}
      <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>دليل الصلاحيات القياسية للمنصة ({totalPlatformPermissions} صلاحية)</span>
          </h3>
          <p className="text-xs text-slate-400">
            تفاصيل كل صلاحية وتأثيرها على العمليات الحساسة داخل لوحة تحكم ZarnixPay
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADMIN_PERMISSIONS_DIRECTORY.map((item) => (
            <div
              key={item.key}
              className="rounded-xl bg-[#040B1A] border border-white/10 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-extrabold text-white">{item.title}</h4>
                <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold shrink-0">
                  {item.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
