'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, CheckCheck, ChevronLeft, Send, Settings2, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { formatTripoliDateTime } from '@/lib/format';
import type { AppNotification, UserNotificationPreferences } from '@/lib/types';

export function NotificationsClient({
  userId,
  initialNotifications,
  initialPreferences,
}: {
  userId: string;
  initialNotifications: AppNotification[];
  initialPreferences: UserNotificationPreferences;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [prefs, setPrefs] = useState(initialPreferences);
  const [pushFeedback, setPushFeedback] = useState('');
  const [testingPush, setTestingPush] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const {
    pushSupported,
    pushPermission,
    isPushSubscribed,
    syncingPush,
    isIOS,
    isInstalled,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  } = usePWA({ userId });

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', notificationId: id }),
    });
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
  };

  const togglePref = async (key: keyof UserNotificationPreferences) => {
    const next = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: next }));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_preferences',
        preferences: { [key]: next },
      }),
    });
  };

  const handleToggleWebPush = async () => {
    setPushFeedback('');
    if (isPushSubscribed) {
      await unsubscribeFromPush();
      setPrefs((p) => ({ ...p, web_push_enabled: false }));
      setPushFeedback('تم إيقاف الإشعارات الفورية على هذا الجهاز.');
    } else {
      const res = await subscribeToPush();
      if (res.ok) {
        setPrefs((p) => ({ ...p, web_push_enabled: true }));
        setPushFeedback('تم تفعيل الإشعارات الخارجية بنجاح! ستصلك التنبيهات في أعلى الهاتف حتى عند إغلاق التطبيق.');
      } else {
        setPushFeedback(res.error || 'تعذر تفعيل الإشعارات');
      }
    }
  };

  const handleTestPush = async (delaySeconds = 0) => {
    if (testingPush) return;
    setTestingPush(true);
    setPushFeedback('');

    try {
      if (delaySeconds > 0) {
        for (let s = delaySeconds; s > 0; s -= 1) {
          setCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(null);
      }

      const res = await sendTestPush();
      if (res.ok && res.sentCount > 0) {
        setPrefs((p) => ({ ...p, web_push_enabled: true }));
        setPushFeedback(`تم إرسال إشعار خارجي مباشر إلى ${res.sentCount} جهاز بنجاح.`);
      } else {
        setPushFeedback(
          res.lastError ||
            res.error ||
            'تعذر إرسال الإشعار الخارجي — تأكد من السماح بالإشعارات في إعدادات المتصفح والهاتف.'
        );
      }
    } finally {
      setCountdown(null);
      setTestingPush(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Web Push Subscription Card */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-[#10F5A6]/35 flex items-center justify-center text-[#10F5A6]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">الإشعارات الخارجية الفورية</h1>
              <p className="text-xs text-slate-400">
                {pushSupported
                  ? isPushSubscribed
                    ? 'مفعّلة ومرتبطة بهذا الجهاز — تصلك خارج التطبيق'
                    : pushPermission === 'denied'
                      ? 'محظورة من إعدادات المتصفح — فعّلها من إعدادات الموقع'
                      : 'غير مفعّلة على هذا الجهاز بعد'
                  : 'المتصفح الحالي لا يدعم إشعارات الخلفية'}
              </p>
            </div>
          </div>

          {pushSupported && (
            <button
              type="button"
              disabled={syncingPush}
              onClick={handleToggleWebPush}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap disabled:opacity-60 ${
                isPushSubscribed
                  ? 'bg-slate-800 text-slate-200 border border-white/15 hover:bg-slate-700'
                  : 'bg-[#10F5A6] text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {syncingPush ? 'جاري التفعيل...' : isPushSubscribed ? 'إيقاف مؤقت' : 'تفعيل الآن'}
            </button>
          )}
        </div>

        {isIOS && !isInstalled && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
            <p className="leading-relaxed">
              على أجهزة iPhone و iPad، لوصول الإشعارات خارج المتصفح يرجى الضغط على زر <strong>مشاركة</strong> في Safari ثم اختيار <strong>إضافة إلى الشاشة الرئيسية</strong> وفتح التطبيق من الأيقونة الجديدة.
            </p>
          </div>
        )}

        {pushSupported && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={testingPush || syncingPush}
              onClick={() => handleTestPush(0)}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-[#10F5A6]/45 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-[#10F5A6]" />
              <span>إرسال إشعار تجريبي فوري</span>
            </button>
            <button
              type="button"
              disabled={testingPush || syncingPush}
              onClick={() => handleTestPush(3)}
              className="px-3.5 py-2 rounded-xl bg-sky-500/15 border border-sky-400/30 hover:border-sky-400/60 text-xs font-semibold text-sky-200 inline-flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {countdown !== null
                  ? `سيصل خلال ${countdown} ثانية — اخرج من التطبيق الآن`
                  : 'اختبار بعد 3 ثوانٍ (اخرج من التطبيق الآن)'}
              </span>
            </button>
          </div>
        )}

        {pushFeedback && <p className="text-xs text-[#10F5A6] leading-relaxed">{pushFeedback}</p>}
      </div>

      {/* Granular Notification Preferences */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-sky-400" />
          <span>تخصيص أنواع الإشعارات</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {[
            { key: 'order_updates' as const, label: 'تحديثات الطلبات' },
            { key: 'rate_alerts' as const, label: 'تنبيهات أسعار USDT' },
            { key: 'promotions' as const, label: 'العروض والمكافآت' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => togglePref(item.key)}
              className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                prefs[item.key]
                  ? 'bg-emerald-500/10 border-[#10F5A6]/40 text-white'
                  : 'bg-[#071124] border-white/10 text-slate-400'
              }`}
            >
              <span className="font-semibold">{item.label}</span>
              <span
                className={`w-8 h-4 rounded-full p-0.5 transition flex items-center ${
                  prefs[item.key] ? 'bg-[#10F5A6] justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#050B18]" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification Feed */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#10F5A6]" />
            <span>سجل الإشعارات</span>
          </h2>
          {notifications.some((n) => !n.is_read) && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              <CheckCheck className="w-4 h-4" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">لا توجد إشعارات حتى الآن.</p>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl p-3.5 border transition ${
                  n.is_read
                    ? 'bg-[#071124]/60 border-white/10'
                    : 'bg-emerald-500/10 border-[#10F5A6]/35'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white">{n.title}</p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 tabular-nums">
                      {formatTripoliDateTime(n.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-[11px] text-[#10F5A6] hover:underline font-semibold"
                      >
                        مقروء
                      </button>
                    )}
                    {n.action_url && (
                      <Link
                        href={n.action_url}
                        onClick={() => !n.is_read && markRead(n.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-semibold hover:underline"
                      >
                        <span>فتح</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
