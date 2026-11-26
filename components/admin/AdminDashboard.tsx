'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import type {
  AdminAuditLog,
  AppNotification,
  ExchangeRates,
  LedgerEntry,
  NotificationTemplate,
  PaymentAccount,
  PlatformWallet,
  SeoSetting,
  SiteContent,
  SupportMessage,
} from '@/lib/types';
import { AdminAuthGate } from './AdminAuthGate';
import { AdminContentTab, AdminSeoTab } from './AdminContentSeoTab';
import { AdminOrdersTab, type EnrichedOrder } from './AdminOrdersTab';
import { AdminPaymentsWalletsTab, AdminRatesTab } from './AdminRatesPaymentsTab';
import {
  AdminNotificationsTab,
  AdminSupportMessagesTab,
  AdminUsersTab,
  type EnrichedAdminUser,
} from './AdminUsersNotifsTab';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'rates'
  | 'payments'
  | 'users'
  | 'support'
  | 'notifications'
  | 'content'
  | 'seo'
  | 'audit';

interface OverviewResponse {
  kpis: {
    totalUsers: number;
    buyOrdersCount: number;
    sellOrdersCount: number;
    pendingOrdersCount: number;
    completedOrdersCount: number;
    rejectedOrdersCount: number;
    totalVolumeUsdt: number;
    totalVolumeLyd: number;
    totalMarginProfitLyd: number;
  };
  dailyStats: Array<{ date: string; usdt: number; count: number; profitLyd: number }>;
  monthlyStats: Array<{ month: string; usdt: number; count: number; profitLyd: number }>;
  recentAuditLogs: AdminAuditLog[];
  integrations: {
    supabaseConnected: boolean;
    resalaConnected: boolean;
    vapidEnvConfigured: boolean;
    adminPasscodeEnvConfigured: boolean;
  };
}

export function AdminDashboard() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [needsFirstRunClaim, setNeedsFirstRunClaim] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [initialOrderId, setInitialOrderId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [users, setUsers] = useState<EnrichedAdminUser[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [notifLogs, setNotifLogs] = useState<AppNotification[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [seoList, setSeoList] = useState<SeoSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);

  const loadAllAdminData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [ovRes, ordRes, rateRes, accRes, walRes, usrRes, supRes, notifRes, cntRes, seoRes, audRes] =
        await Promise.all([
          fetch('/api/admin/overview'),
          fetch('/api/admin/orders'),
          fetch('/api/admin/rates'),
          fetch('/api/admin/payment-accounts'),
          fetch('/api/admin/wallets'),
          fetch('/api/admin/users'),
          fetch('/api/admin/support-messages'),
          fetch('/api/admin/notifications'),
          fetch('/api/admin/content'),
          fetch('/api/admin/seo'),
          fetch('/api/admin/audit-logs'),
        ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (ordRes.ok) setOrders(((await ordRes.json()) as { orders: EnrichedOrder[] }).orders || []);
      if (rateRes.ok) setRates(((await rateRes.json()) as { rates: ExchangeRates }).rates);
      if (accRes.ok) setAccounts(((await accRes.json()) as { accounts: PaymentAccount[] }).accounts || []);
      if (walRes.ok) setWallets(((await walRes.json()) as { wallets: PlatformWallet[] }).wallets || []);
      if (usrRes.ok) setUsers(((await usrRes.json()) as { users: EnrichedAdminUser[] }).users || []);
      if (supRes.ok) setSupportMessages(((await supRes.json()) as { messages: SupportMessage[] }).messages || []);
      if (notifRes.ok) {
        const nd = (await notifRes.json()) as { templates: NotificationTemplate[]; logs: AppNotification[] };
        setTemplates(nd.templates || []);
        setNotifLogs(nd.logs || []);
      }
      if (cntRes.ok) setContent(((await cntRes.json()) as { content: SiteContent }).content);
      if (seoRes.ok) setSeoList(((await seoRes.json()) as { seoList: SeoSetting[] }).seoList || []);
      if (audRes.ok) {
        const ad = (await audRes.json()) as { auditLogs: AdminAuditLog[]; ledgerEntries: LedgerEntry[] };
        setAuditLogs(ad.auditLogs || []);
        setLedgerEntries(ad.ledgerEntries || []);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/admin-access');
      const data = (await res.json()) as { authorized: boolean; needsFirstRunClaim: boolean };
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const tabParam = sp.get('tab') as AdminTab | null;
        const orderParam = sp.get('orderId');
        if (
          tabParam &&
          ['overview', 'orders', 'rates', 'payments', 'users', 'support', 'notifications', 'content', 'seo', 'audit'].includes(
            tabParam
          )
        ) {
          setActiveTab(tabParam);
        }
        if (orderParam) {
          setInitialOrderId(orderParam);
        }
      }
      setAuthorized(data.authorized);
      setNeedsFirstRunClaim(data.needsFirstRunClaim);
      if (data.authorized) {
        await loadAllAdminData();
      }
    } finally {
      setCheckingAuth(false);
    }
  }, [loadAllAdminData]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const handleLogout = async () => {
    await fetch('/api/auth/admin-access', { method: 'DELETE' });
    setAuthorized(false);
    checkAccess();
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10F5A6]" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <AdminAuthGate
        needsFirstRunClaim={needsFirstRunClaim}
        onAuthenticated={() => {
          setAuthorized(true);
          loadAllAdminData();
        }}
      />
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'الرئيسية والإحصائيات', icon: BarChart3 },
    { id: 'orders', label: `الطلبات (${orders.length})`, icon: FileText },
    { id: 'rates', label: 'إدارة التسعير', icon: DollarSign },
    { id: 'payments', label: 'الدفع والمحافظ', icon: CreditCard },
    { id: 'users', label: 'المستخدمون', icon: Users },
    { id: 'support', label: `رسائل الدعم (${supportMessages.filter((m) => m.status !== 'resolved').length})`, icon: MessageSquare },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'content', label: 'المحتوى والهوية', icon: ImageIcon },
    { id: 'seo', label: 'إدارة SEO', icon: Globe },
    { id: 'audit', label: 'السجل المالي والتدقيق', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-dvh max-w-7xl mx-auto px-4 py-5 space-y-5">
      {/* Standalone Top Admin Header */}
      <header className="tl-glass-card rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 flex items-center justify-center text-[#10F5A6]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white">
              بوابة الإدارة المستقلة — تيتر ليبيا
            </h1>
            <p className="text-[11px] text-slate-400 font-[family-name:var(--font-latin)]">
              Tether Libya Isolated Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllAdminData}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 hover:border-emerald-400/40"
          >
            {loadingData ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-300 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition whitespace-nowrap ${
                active
                  ? 'bg-[#10F5A6] text-slate-950 border-[#10F5A6]'
                  : 'bg-[#09142B] text-slate-300 border-white/10 hover:border-white/25'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="إجمالي المستخدمين" value={String(overview.kpis.totalUsers)} />
            <KpiCard label="طلبات قيد المراجعة" value={String(overview.kpis.pendingOrdersCount)} accent="text-amber-300" />
            <KpiCard label="الطلبات المكتملة" value={String(overview.kpis.completedOrdersCount)} accent="text-[#10F5A6]" />
            <KpiCard label="الطلبات المرفوضة" value={String(overview.kpis.rejectedOrdersCount)} accent="text-rose-300" />
            <KpiCard label="طلبات الشراء" value={String(overview.kpis.buyOrdersCount)} />
            <KpiCard label="طلبات البيع" value={String(overview.kpis.sellOrdersCount)} />
            <KpiCard label="إجمالي التداول (USDT)" value={overview.kpis.totalVolumeUsdt.toFixed(2)} accent="text-[#10F5A6]" />
            <KpiCard label="الأرباح والعمولات (د.ل)" value={overview.kpis.totalMarginProfitLyd.toFixed(3)} accent="text-sky-300" />
          </div>

          {/* Daily & Monthly Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="tl-glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10F5A6]" />
                <span>الإحصائيات اليومية</span>
              </h2>
              {overview.dailyStats.length === 0 ? (
                <p className="text-xs text-slate-400">لا توجد عمليات مكتملة بعد لعرض السلسلة اليومية.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {overview.dailyStats.map((d) => (
                    <div key={d.date} className="flex items-center justify-between bg-[#071124] px-3 py-2 rounded-xl">
                      <span className="font-mono text-slate-300">{d.date}</span>
                      <span className="text-white tabular-nums">{d.count} طلبات · {d.usdt.toFixed(2)} USDT</span>
                      <span className="text-[#10F5A6] tabular-nums">+{d.profitLyd.toFixed(2)} د.ل</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Integrations Readiness */}
            <div className="tl-glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>حالة الربط والتكاملات الأمنية</span>
              </h2>
              <div className="space-y-2 text-xs">
                <StatusRow
                  label="قاعدة بيانات Supabase (PostgreSQL + Storage + RLS)"
                  ok={overview.integrations.supabaseConnected}
                  hint="أضف NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في Secrets"
                />
                <StatusRow
                  label="بوابة الرسائل القصيرة رسالة (Resala SMS OTP)"
                  ok={overview.integrations.resalaConnected}
                  hint="أضف RESALA_API_TOKEN في Secrets للإرسال الفعلي"
                />
                <StatusRow
                  label="مفاتيح VAPID للإشعارات الفورية"
                  ok={overview.integrations.vapidEnvConfigured}
                  hint="يتم استخدام مفاتيح خادم مؤقتة حتى تضيف VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY"
                />
                <StatusRow
                  label="رمز الإدارة البيئي (ADMIN_PASSCODE)"
                  ok={overview.integrations.adminPasscodeEnvConfigured}
                  hint="مؤمّن بكلمة مرور المشرف الأول؛ يمكنك تعيين ADMIN_PASSCODE في Secrets"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <AdminOrdersTab orders={orders} initialOrderId={initialOrderId} onReload={loadAllAdminData} />
      )}
      {activeTab === 'rates' && rates && <AdminRatesTab rates={rates} onReload={loadAllAdminData} />}
      {activeTab === 'payments' && (
        <AdminPaymentsWalletsTab accounts={accounts} wallets={wallets} onReload={loadAllAdminData} />
      )}
      {activeTab === 'users' && <AdminUsersTab users={users} onReload={loadAllAdminData} />}
      {activeTab === 'support' && (
        <AdminSupportMessagesTab messages={supportMessages} onReload={loadAllAdminData} />
      )}
      {activeTab === 'notifications' && (
        <AdminNotificationsTab
          users={users}
          templates={templates}
          logs={notifLogs}
          onReload={loadAllAdminData}
        />
      )}
      {activeTab === 'content' && content && (
        <AdminContentTab content={content} onReload={loadAllAdminData} />
      )}
      {activeTab === 'seo' && <AdminSeoTab seoList={seoList} onReload={loadAllAdminData} />}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="tl-glass-card rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-extrabold text-white">السجل المالي غير القابل للتعديل (Immutable Ledger)</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
              {ledgerEntries.length === 0 ? (
                <p className="text-slate-400">لا توجد قيود مالية مسجلة بعد.</p>
              ) : (
                ledgerEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-[#071124] border border-white/10 p-3 flex justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{entry.description}</p>
                      <p className="text-[10px] text-slate-400">{entry.entry_type} · {formatTripoliDateTime(entry.created_at)}</p>
                    </div>
                    <span className={`font-mono font-bold ${entry.direction === 'credit' ? 'text-[#10F5A6]' : 'text-sky-300'}`}>
                      {entry.direction === 'credit' ? '+' : '-'}{Number(entry.amount).toFixed(3)} {entry.currency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tl-glass-card rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-extrabold text-white">سجل النشاط الإداري (Audit Log)</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400">لا توجد سجلات بعد.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl bg-[#071124] border border-white/10 p-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-sky-300">{log.action}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {formatTripoliDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {log.actor_role} · {log.target_type} ({log.target_id.slice(0, 12)})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent = 'text-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="tl-glass-card rounded-2xl p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="rounded-xl bg-[#071124] border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-white">{label}</span>
        <span className={`px-2 py-0.5 rounded font-bold ${ok ? 'bg-emerald-500/20 text-[#10F5A6]' : 'bg-amber-500/20 text-amber-300'}`}>
          {ok ? 'متصل' : 'وضع المعاينة'}
        </span>
      </div>
      {!ok && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
