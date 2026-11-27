'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ExternalLink,
  MapPin,
  MessageSquare,
  Search,
  Send,
  ShieldBan,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import type {
  AppNotification,
  KycStatus,
  NotificationTemplate,
  Order,
  SupportMessage,
  User,
} from '@/lib/types';

export interface NotificationRecipient {
  id: string;
  full_name: string;
  phone: string;
}

export interface EnrichedAdminUser extends User {
  ordersCount: number;
  recentOrders: Order[];
}

export function AdminUsersTab({
  users,
  onReload,
}: {
  users: EnrichedAdminUser[];
  onReload: () => void;
}) {
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const [reverifyUserId, setReverifyUserId] = useState<string | null>(null);
  const [reverifyNote, setReverifyNote] = useState('');

  const filtered = users.filter((u) => {
    const q = query.trim();
    if (!q) return true;
    return (
      u.phone.includes(q) ||
      u.full_name.includes(q) ||
      (u.first_name || '').includes(q) ||
      (u.last_name || '').includes(q) ||
      (u.city_area || '').includes(q)
    );
  });

  const updateUserField = async (
    userId: string,
    patch: { is_banned?: boolean; kyc_status?: KycStatus; kyc_note?: string | null }
  ) => {
    setMsg('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      setMsg('تم تحديث بيانات العميل وإرسال التنبيه اللازم بنجاح.');
      setReverifyUserId(null);
      setReverifyNote('');
      onReload();
    }
  };

  return (
    <div className="tl-glass-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-white">إدارة المستخدمين وتوثيق الهوية ({users.length})</h2>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث برقم الهاتف أو الاسم أو المدينة..."
            className="w-full rounded-xl bg-[#071124] border border-white/15 pr-9 pl-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      {msg && <p className="text-xs text-[#10F5A6] font-semibold">{msg}</p>}

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">لا يوجد مستخدمون مطابقون لنتيجة البحث.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl bg-[#071124] border border-white/10 p-4 text-xs space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="font-bold text-white flex flex-wrap items-center gap-2">
                    <span>
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.full_name}
                    </span>
                    {u.is_banned && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">محظور</span>
                    )}
                    {u.terms_accepted_at && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10F5A6] text-[10px] inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>وافق على الشروط</span>
                      </span>
                    )}
                    {u.kyc_status === 'needs_reverification' && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        بانتظار إعادة التوثيق
                      </span>
                    )}
                  </div>

                  <div className="text-slate-400 tabular-nums flex flex-wrap items-center gap-2">
                    <span dir="ltr">+{u.phone}</span>
                    {u.city_area && (
                      <span className="inline-flex items-center gap-1 text-sky-300">
                        <MapPin className="w-3 h-3" />
                        <span>{u.city_area}</span>
                      </span>
                    )}
                    <span>· العمليات: {u.ordersCount}</span>
                    <span>· الحجم: {Number(u.total_volume_usdt).toFixed(2)} USDT</span>
                  </div>

                  {(u.passport_image_url || u.birth_cert_image_url) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {u.passport_image_url && (
                        <a
                          href={u.passport_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 hover:bg-sky-500/25 font-semibold text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>عرض جواز السفر</span>
                        </a>
                      )}
                      {u.birth_cert_image_url && (
                        <a
                          href={u.birth_cert_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-[#10F5A6] hover:bg-emerald-500/25 font-semibold text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>عرض شهادة الميلاد</span>
                        </a>
                      )}
                    </div>
                  )}

                  {u.kyc_note && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1.5">
                      ملاحظة التوثيق: {u.kyc_note}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={u.kyc_status}
                    onChange={(e) => {
                      const next = e.target.value as KycStatus;
                      if (next === 'needs_reverification') {
                        setReverifyUserId(u.id);
                        setReverifyNote(u.kyc_note || '');
                      } else {
                        updateUserField(u.id, { kyc_status: next });
                      }
                    }}
                    className="rounded-lg bg-[#0B1730] border border-white/15 px-2.5 py-1.5 text-[11px] text-white"
                  >
                    <option value="unverified">غير موثق</option>
                    <option value="pending">قيد المراجعة</option>
                    <option value="verified">موثق بالكامل</option>
                    <option value="needs_reverification">مطلوب إعادة التوثيق</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setReverifyUserId(reverifyUserId === u.id ? null : u.id);
                      setReverifyNote(u.kyc_note || '');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold inline-flex items-center gap-1 text-[11px]"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>طلب إعادة توثيق</span>
                  </button>

                  <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 font-semibold">
                    حساب عميل
                  </span>

                  <button
                    type="button"
                    onClick={() => updateUserField(u.id, { is_banned: !u.is_banned })}
                    className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 ${
                      u.is_banned
                        ? 'bg-emerald-500/20 text-[#10F5A6]'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {u.is_banned ? <UserCheck className="w-3.5 h-3.5" /> : <ShieldBan className="w-3.5 h-3.5" />}
                    <span>{u.is_banned ? 'إلغاء الحظر' : 'حظر'}</span>
                  </button>
                </div>
              </div>

              {reverifyUserId === u.id && (
                <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={reverifyNote}
                    onChange={(e) => setReverifyNote(e.target.value)}
                    placeholder="اكتب سبب طلب إعادة التوثيق (مثال: صورة جواز السفر غير واضحة أو شهادة الميلاد مقطوعة)..."
                    className="flex-1 min-w-[240px] rounded-xl bg-[#0B1730] border border-amber-400/35 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateUserField(u.id, {
                        kyc_status: 'needs_reverification',
                        kyc_note:
                          reverifyNote.trim() ||
                          'يرجى إعادة رفع صور واضحة ومكتملة لجواز السفر وشهادة الميلاد.',
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs"
                  >
                    إرسال إشعار إعادة التوثيق
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNotificationsTab({
  recipients,
  templates,
  logs,
  onReload,
}: {
  recipients: NotificationRecipient[];
  templates: NotificationTemplate[];
  logs: AppNotification[];
  onReload: () => void;
}) {
  const [targetUserId, setTargetUserId] = useState<'all' | string>('all');
  const [type, setType] = useState<'order_updates' | 'rate_alerts' | 'promotions'>('promotions');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', targetUserId, type, title, body, actionUrl }),
      });
      const data = (await res.json()) as {
        sentCount?: number;
        pushCount?: number;
        failedCount?: number;
        subscribedDevices?: number;
        lastError?: string | null;
        error?: string;
      };
      if (res.ok) {
        setTitle('');
        setBody('');
        const subInfo =
          data.subscribedDevices === 0
            ? 'لا توجد أجهزة مفعّلة للإشعارات الخارجية حالياً لدى المستلمين'
            : `تم توصيل Web Push إلى ${data.pushCount || 0} من أصل ${data.subscribedDevices} جهاز${data.lastError ? ` (ملاحظة: ${data.lastError})` : ''}`;
        setFeedback(`تم حفظ الإشعار داخل التطبيق لـ ${data.sentCount || 0} مستخدم — ${subInfo}.`);
        onReload();
      } else {
        setFeedback(data.error || 'تعذر الإرسال');
      }
    } finally {
      setSending(false);
    }
  };

  const toggleTemplate = async (tpl: NotificationTemplate, field: 'is_enabled' | 'channel_push' | 'channel_in_app') => {
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_template',
        templateKey: tpl.key,
        templatePatch: { [field]: !tpl[field] },
      }),
    });
    onReload();
  };

  const updateTemplateText = async (tpl: NotificationTemplate, title_template: string, body_template: string) => {
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_template',
        templateKey: tpl.key,
        templatePatch: { title_template, body_template },
      }),
    });
    setFeedback(`تم تحديث قالب "${tpl.name_ar}"`);
    onReload();
  };

  return (
    <div className="space-y-5">
      {feedback && <p className="text-xs text-[#10F5A6] font-bold">{feedback}</p>}

      {/* Send Broadcast / Direct */}
      <form onSubmit={sendBroadcast} className="tl-glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-[#10F5A6]" />
          <span>إرسال إشعار فوري (داخل التطبيق + Web Push)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          >
            <option value="all">جميع المستخدمين ({recipients.length})</option>
            {recipients.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} (+{u.phone})
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'order_updates' | 'rate_alerts' | 'promotions')}
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          >
            <option value="promotions">عروض وتنبيهات عامة</option>
            <option value="rate_alerts">تنبيهات الأسعار</option>
            <option value="order_updates">تحديثات الطلبات</option>
          </select>

          <input
            type="text"
            dir="ltr"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="رابط الانتقال (مثال: /buy)"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white text-left"
          />
        </div>

        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإشعار"
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-xs text-white"
        />
        <textarea
          required
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="نص الإشعار..."
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs"
        >
          {sending ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
        </button>
      </form>

      {/* Notification Templates */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-400" />
          <span>قوالب الإشعارات التلقائية</span>
        </h2>
        <div className="space-y-2.5">
          {templates.map((tpl) => (
            <TemplateRow
              key={`${tpl.id}:${tpl.title_template}:${tpl.body_template}`}
              tpl={tpl}
              onToggle={toggleTemplate}
              onSaveText={updateTemplateText}
            />
          ))}
        </div>
      </div>

      {/* Send Logs */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">سجل الإشعارات المرسلة ({logs.length})</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {logs.slice(0, 30).map((log) => {
            const recipient = recipients.find((u) => u.id === log.user_id);
            return (
              <div key={log.id} className="rounded-xl bg-[#071124] border border-white/10 p-3 text-xs flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{log.title}</p>
                  <p className="text-slate-400 truncate">{log.body}</p>
                  {recipient && (
                    <p className="text-[10px] text-sky-300 mt-0.5 truncate">
                      المستلم: {recipient.full_name} (<span dir="ltr">+{recipient.phone}</span>)
                    </p>
                  )}
                </div>
                <div className="text-left shrink-0 text-[10px] text-slate-400 tabular-nums">
                  <div>{log.push_status}</div>
                  <div>{formatTripoliDateTime(log.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TemplateRow({
  tpl,
  onToggle,
  onSaveText,
}: {
  tpl: NotificationTemplate;
  onToggle: (tpl: NotificationTemplate, field: 'is_enabled' | 'channel_push' | 'channel_in_app') => void;
  onSaveText: (tpl: NotificationTemplate, title: string, body: string) => void;
}) {
  const [title, setTitle] = useState(tpl.title_template);
  const [body, setBody] = useState(tpl.body_template);

  return (
    <div className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 text-xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-white">{tpl.name_ar}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(tpl, 'is_enabled')}
            className={`px-2 py-1 rounded ${tpl.is_enabled ? 'bg-emerald-500/20 text-[#10F5A6]' : 'bg-slate-800 text-slate-400'}`}
          >
            {tpl.is_enabled ? 'مفعّل' : 'معطّل'}
          </button>
          <button
            type="button"
            onClick={() => onToggle(tpl, 'channel_in_app')}
            className={`px-2 py-1 rounded ${tpl.channel_in_app ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}
          >
            In-App {tpl.channel_in_app ? '✓' : '✗'}
          </button>
          <button
            type="button"
            onClick={() => onToggle(tpl, 'channel_push')}
            className={`px-2 py-1 rounded ${tpl.channel_push ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
          >
            Push {tpl.channel_push ? '✓' : '✗'}
          </button>
        </div>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg bg-[#0B1730] border border-white/10 px-2.5 py-1.5 text-white"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 rounded-lg bg-[#0B1730] border border-white/10 px-2.5 py-1.5 text-slate-200"
        />
        <button
          type="button"
          onClick={() => onSaveText(tpl, title, body)}
          className="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-bold"
        >
          حفظ
        </button>
      </div>
    </div>
  );
}

export function AdminSupportMessagesTab({
  messages,
  onReload,
}: {
  messages: SupportMessage[];
  onReload: () => void;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  const updateTicket = async (
    msgItem: SupportMessage,
    status: SupportMessage['status']
  ) => {
    setFeedback('');
    const replyNote = notes[msgItem.id] ?? msgItem.admin_reply_note ?? '';
    const res = await fetch('/api/admin/support-messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgItem.id,
        status,
        admin_reply_note: replyNote,
      }),
    });
    if (res.ok) {
      setFeedback('تم تحديث حالة رسالة الدعم بنجاح.');
      onReload();
    }
  };

  return (
    <div className="tl-glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#10F5A6]" />
          <span>رسائل الدعم الفني والتواصل ({messages.length})</span>
        </h2>
      </div>

      {feedback && <p className="text-xs text-[#10F5A6] font-bold">{feedback}</p>}

      {messages.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">
          لا توجد رسائل دعم فني مرسلة من صفحة اتصل بنا حتى الآن.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-[#071124] border border-white/10 p-4 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white">{m.subject}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-sky-300">{m.name}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span dir="ltr" className="font-mono text-slate-300">{m.phone}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                    m.status === 'resolved'
                      ? 'bg-emerald-500/20 text-[#10F5A6]'
                      : m.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {m.status === 'resolved'
                    ? 'تمت المعالجة'
                    : m.status === 'in_progress'
                      ? 'قيد المتابعة'
                      : 'جديدة'}
                </span>
              </div>

              <p className="text-slate-200 leading-relaxed bg-[#0B1730] rounded-xl p-3 border border-white/5">
                {m.message}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={notes[m.id] ?? m.admin_reply_note ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="ملاحظة المتابعة الإدارية..."
                  className="flex-1 min-w-[200px] rounded-xl bg-[#0B1730] border border-white/10 px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => updateTicket(m, 'in_progress')}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold"
                >
                  قيد المتابعة
                </button>
                <button
                  type="button"
                  onClick={() => updateTicket(m, 'resolved')}
                  className="px-3 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold"
                >
                  إغلاق التذكرة
                </button>
              </div>
              <div className="text-[10px] text-slate-500 tabular-nums">
                {formatTripoliDateTime(m.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
