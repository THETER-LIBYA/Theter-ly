'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
  Users2,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import { usePWA } from '@/hooks/usePWA';
import {
  type AdminAuditLog,
  type AdminPermission,
  type AppNotification,
  type ExchangeRates,
  type LedgerEntry,
  type NotificationTemplate,
  type PaymentAccount,
  type PlatformWallet,
  type SeoSetting,
  type SiteContent,
  STAFF_ROLE_LABELS,
  type SupportMessage,
} from '@/lib/types';
import { AdminAuthGate, type AuthenticatedAdminActor } from './AdminAuthGate';
import { AdminContentTab, AdminSeoTab } from './AdminContentSeoTab';
import { AdminOrdersTab, type EnrichedOrder } from './AdminOrdersTab';
import { AdminPaymentsWalletsTab, AdminRatesTab } from './AdminRatesPaymentsTab';
import { AdminStaffTab, type StaffAccountSummary } from './AdminStaffTab';
import {
  AdminNotificationsTab,
  AdminSupportMessagesTab,
  AdminUsersTab,
  type EnrichedAdminUser,
  type NotificationRecipient,
} from './AdminUsersNotifsTab';

type AdminTab = AdminPermission;

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
  const [actor, setActor] = useState<AuthenticatedAdminActor | null>(null);
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
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [notifLogs, setNotifLogs] = useState<AppNotification[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [seoList, setSeoList] = useState<SeoSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [staffList, setStaffList] = useState<StaffAccountSummary[]>([]);
  const [adminPushNote, setAdminPushNote] = useState('');

  const {
    pushSupported,
    isPushSubscribed,
    syncingPush,
    subscribeToPush,
  } = usePWA({ userId: actor?.actorId || null });

  const loadPermittedAdminData = useCallback(async (currentActor: AuthenticatedAdminActor) => {
    const perms = new Set<AdminPermission>(currentActor.permissions);
    setLoadingData(true);
    try {
      const tasks: Promise<void>[] = [];

      if (perms.has('overview')) {
        tasks.push(
          fetch('/api/admin/overview').then(async (res) => {
            if (res.ok) setOverview(await res.json());
          })
        );
      }
      if (perms.has('orders')) {
        tasks.push(
          fetch('/api/admin/orders').then(async (res) => {
            if (res.ok) setOrders(((await res.json()) as { orders: EnrichedOrder[] }).orders || []);
          })
        );
      }
      if (perms.has('rates')) {
        tasks.push(
          fetch('/api/admin/rates').then(async (res) => {
            if (res.ok) setRates(((await res.json()) as { rates: ExchangeRates }).rates);
          })
        );
      }
      if (perms.has('payments')) {
        tasks.push(
          fetch('/api/admin/payment-accounts').then(async (res) => {
            if (res.ok) setAccounts(((await res.json()) as { accounts: PaymentAccount[] }).accounts || []);
          }),
          fetch('/api/admin/wallets').then(async (res) => {
            if (res.ok) setWallets(((await res.json()) as { wallets: PlatformWallet[] }).wallets || []);
          })
        );
      }
      if (perms.has('users')) {
        tasks.push(
          fetch('/api/admin/users').then(async (res) => {
            if (res.ok) setUsers(((await res.json()) as { users: EnrichedAdminUser[] }).users || []);
          })
        );
      }
      if (perms.has('support')) {
        tasks.push(
          fetch('/api/admin/support-messages').then(async (res) => {
            if (res.ok) {
              setSupportMessages(((await res.json()) as { messages: SupportMessage[] }).messages || []);
            }
          })
        );
      }
      if (perms.has('notifications')) {
        tasks.push(
          fetch('/api/admin/notifications').then(async (res) => {
            if (res.ok) {
              const nd = (await res.json()) as {
                templates: NotificationTemplate[];
                logs: AppNotification[];
                recipients?: NotificationRecipient[];
              };
              setTemplates(nd.templates || []);
              setNotifLogs(nd.logs || []);
              setRecipients(nd.recipients || []);
            }
          })
        );
      }
      if (perms.has('content')) {
        tasks.push(
          fetch('/api/admin/content').then(async (res) => {
            if (res.ok) setContent(((await res.json()) as { content: SiteContent }).content);
          })
        );
      }
      if (perms.has('seo')) {
        tasks.push(
          fetch('/api/admin/seo').then(async (res) => {
            if (res.ok) setSeoList(((await res.json()) as { seoList: SeoSetting[] }).seoList || []);
          })
        );
      }
      if (perms.has('audit')) {
        tasks.push(
          fetch('/api/admin/audit-logs').then(async (res) => {
            if (res.ok) {
              const ad = (await res.json()) as {
                auditLogs: AdminAuditLog[];
                ledgerEntries: LedgerEntry[];
              };
              setAuditLogs(ad.auditLogs || []);
              setLedgerEntries(ad.ledgerEntries || []);
            }
          })
        );
      }
      if (currentActor.actorType === 'super_admin' && perms.has('staff')) {
        tasks.push(
          fetch('/api/admin/staff').then(async (res) => {
            if (res.ok) {
              const sd = (await res.json()) as { staff: StaffAccountSummary[] };
              setStaffList(sd.staff || []);
            }
          })
        );
      }

      await Promise.all(tasks);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/admin-access');
      const data = (await res.json()) as {
        authorized: boolean;
        actorId?: string | null;
        actorType?: 'super_admin' | 'staff' | null;
        actorName?: string;
        actorRole?: string;
        permissions?: AdminPermission[];
        needsFirstRunClaim: boolean;
      };

      setNeedsFirstRunClaim(data.needsFirstRunClaim);

      if (data.authorized && data.actorId && data.actorType) {
        const authedActor: AuthenticatedAdminActor = {
          actorId: data.actorId,
          actorType: data.actorType,
          actorName: data.actorName || 'المدير العام',
          actorRole: data.actorRole || 'super_admin',
          permissions: data.permissions || [],
        };
        setActor(authedActor);

        const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const tabParam = sp?.get('tab') as AdminTab | null;
        const orderParam = sp?.get('orderId');
        if (orderParam) setInitialOrderId(orderParam);

        if (tabParam && authedActor.permissions.includes(tabParam)) {
          setActiveTab(tabParam);
        } else if (authedActor.permissions.length > 0 && !authedActor.permissions.includes('overview')) {
          setActiveTab(authedActor.permissions[0]);
        } else {
          setActiveTab('overview');
        }

        await loadPermittedAdminData(authedActor);
      } else {
        setActor(null);
      }
    } finally {
      setCheckingAuth(false);
    }
  }, [loadPermittedAdminData]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const handleLogout = async () => {
    await fetch('/api/auth/admin-access', { method: 'DELETE' });
    setActor(null);
    await checkAccess();
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#040B1A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#10F5A6]" />
      </div>
    );
  }

  if (!actor) {
    return (
      <AdminAuthGate
        needsFirstRunClaim={needsFirstRunClaim}
        onAuthenticated={(authedActor) => {
          setActor(authedActor);
          if (authedActor.permissions.length > 0 && !authedActor.permissions.includes('overview')) {
            setActiveTab(authedActor.permissions[0]);
          } else {
            setActiveTab('overview');
          }
          void loadPermittedAdminData(authedActor);
        }}
      />
    );
  }

  const allTabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    superAdminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'الرئيسية والإحصائيات', icon: BarChart3 },
    { id: 'orders', label: 'الطلبات والمراجعة', icon: FileText, badge: orders.filter((o) => ['pending_review', 'under_review', 'needs_edit'].includes(o.status)).length },
    { id: 'rates', label: 'إدارة التسعير', icon: DollarSign },
    { id: 'payments', label: 'الدفع والمحافظ', icon: CreditCard },
    { id: 'users', label: 'العملاء والتوثيق', icon: Users },
    { id: 'support', label: 'رسائل الدعم', icon: MessageSquare, badge: supportMessages.filter((m) => m.status !== 'resolved').length },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'content', label: 'المحتوى والهوية', icon: ImageIcon },
    { id: 'seo', label: 'إدارة SEO', icon: Globe },
    { id: 'audit', label: 'السجل المالي والتدقيق', icon: ShieldCheck },
    { id: 'staff', label: 'طاقم العمل والأدوار', icon: Users2, superAdminOnly: true },
  ];

  const permittedTabs = allTabs.filter((tab) => {
    if (tab.superAdminOnly && actor.actorType !== 'super_admin') return false;
    return actor.permissions.includes(tab.id);
  });

  const roleDisplay =
    STAFF_ROLE_LABELS[actor.actorRole as keyof typeof STAFF_ROLE_LABELS] || actor.actorRole;

  const reloadCurrentActorData = () => {
    void loadPermittedAdminData(actor);
  };

  return (
    <div className="min-h-dvh bg-[#040B1A] text-slate-100">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-4 lg:py-6 flex flex-col lg:flex-row gap-5">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col gap-3">
          <div className="rounded-2xl bg-[#081226] border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white truncate">تيتر ليبيا</div>
                <div className="text-[10px] text-slate-400 font-[family-name:var(--font-latin)] truncate">
                  Control Center
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#040B1A] border border-white/10 px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <UserCog className="w-3.5 h-3.5 text-[#10F5A6] shrink-0" />
                <span className="truncate">{actor.actorName}</span>
              </div>
              <div className="text-[11px] text-sky-300 font-semibold">{roleDisplay}</div>
            </div>
          </div>

          <nav className="rounded-2xl bg-[#081226] border border-white/10 p-2.5 space-y-1 flex-1">
            {permittedTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition ${
                    active
                      ? 'bg-[#10F5A6] text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                        active ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Top Bar */}
          <header className="rounded-2xl bg-[#081226] border border-white/10 px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden w-9 h-9 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {permittedTabs.find((t) => t.id === activeTab)?.label || 'لوحة التحكم الإدارية'}
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  {actor.actorName} · {roleDisplay}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pushSupported && (
                isPushSubscribed ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-[#10F5A6]/30 text-[11px] text-[#10F5A6] font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تنبيهات الإدارة مفعّلة</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={syncingPush}
                    onClick={async () => {
                      setAdminPushNote('');
                      const res = await subscribeToPush();
                      setAdminPushNote(
                        res.ok ? 'تم تفعيل تنبيهات الإدارة الخارجية بنجاح' : res.error || 'تعذر التفعيل'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/35 text-xs text-sky-200 font-bold inline-flex items-center gap-1.5 hover:bg-sky-500/25 transition"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>تفعيل تنبيهات الإدارة</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={reloadCurrentActorData}
                disabled={loadingData}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 hover:border-[#10F5A6]/40 inline-flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>{loadingData ? 'تحديث...' : 'تحديث'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-300 font-bold inline-flex items-center gap-1.5 hover:bg-rose-500/25 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
            {adminPushNote && (
              <p className="w-full text-[11px] text-[#10F5A6] font-semibold">{adminPushNote}</p>
            )}
          </header>

          {/* Mobile Horizontal Nav */}
          <nav className="lg:hidden flex gap-2 overflow-x-auto pb-1">
            {permittedTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#10F5A6] text-slate-950 border-[#10F5A6]'
                      : 'bg-[#081226] text-slate-300 border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums ${
                        active ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active Tab View */}
          {activeTab === 'overview' && actor.permissions.includes('overview') && overview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="إجمالي العملاء" value={String(overview.kpis.totalUsers)} />
                <KpiCard
                  label="طلبات قيد المراجعة"
                  value={String(overview.kpis.pendingOrdersCount)}
                  accent="text-amber-300"
                />
                <KpiCard
                  label="الطلبات المكتملة"
                  value={String(overview.kpis.completedOrdersCount)}
                  accent="text-[#10F5A6]"
                />
                <KpiCard
                  label="الطلبات المرفوضة"
                  value={String(overview.kpis.rejectedOrdersCount)}
                  accent="text-rose-300"
                />
                <KpiCard label="عمليات الشراء" value={String(overview.kpis.buyOrdersCount)} />
                <KpiCard label="عمليات البيع" value={String(overview.kpis.sellOrdersCount)} />
                <KpiCard
                  label="حجم التداول (USDT)"
                  value={overview.kpis.totalVolumeUsdt.toFixed(2)}
                  accent="text-[#10F5A6]"
                />
                <KpiCard
                  label="هامش الأرباح (د.ل)"
                  value={overview.kpis.totalMarginProfitLyd.toFixed(3)}
                  accent="text-sky-300"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#10F5A6]" />
                    <span>النشاط اليومي المكتمل</span>
                  </h2>
                  {overview.dailyStats.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      لا توجد عمليات مكتملة بعد لعرض السلسلة اليومية.
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {overview.dailyStats.map((d) => (
                        <div
                          key={d.date}
                          className="flex items-center justify-between bg-[#040B1A] border border-white/5 px-3 py-2.5 rounded-xl"
                        >
                          <span className="font-mono text-slate-300">{d.date}</span>
                          <span className="text-white tabular-nums">
                            {d.count} طلبات · {d.usdt.toFixed(2)} USDT
                          </span>
                          <span className="text-[#10F5A6] tabular-nums font-bold">
                            +{d.profitLyd.toFixed(2)} د.ل
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>جاهزية الخدمات ومتغيرات البيئة</span>
                  </h2>
                  <div className="space-y-2 text-xs">
                    <StatusRow
                      label="قاعدة بيانات Supabase (PostgreSQL + Storage + RLS)"
                      ok={overview.integrations.supabaseConnected}
                      hint="يرجى ضبط NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة"
                    />
                    <StatusRow
                      label="بوابة الرسائل القصيرة رسالة (Resala SMS OTP)"
                      ok={overview.integrations.resalaConnected}
                      hint="يرجى ضبط RESALA_API_TOKEN في متغيرات البيئة لتفعيل الإرسال النصي"
                    />
                    <StatusRow
                      label="مفاتيح VAPID للإشعارات الخارجية الفورية"
                      ok={overview.integrations.vapidEnvConfigured}
                      hint="يرجى إضافة VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY و VAPID_SUBJECT في متغيرات البيئة"
                    />
                    <StatusRow
                      label="رمز المدير العام البيئي (ADMIN_PASSCODE)"
                      ok={overview.integrations.adminPasscodeEnvConfigured}
                      hint="يُنصح بتعيين ADMIN_PASSCODE في متغيرات البيئة لتعزيز الحماية"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && actor.permissions.includes('orders') && (
            <AdminOrdersTab
              orders={orders}
              initialOrderId={initialOrderId}
              onReload={reloadCurrentActorData}
            />
          )}

          {activeTab === 'rates' && actor.permissions.includes('rates') && rates && (
            <AdminRatesTab rates={rates} onReload={reloadCurrentActorData} />
          )}

          {activeTab === 'payments' && actor.permissions.includes('payments') && (
            <AdminPaymentsWalletsTab
              accounts={accounts}
              wallets={wallets}
              onReload={reloadCurrentActorData}
            />
          )}

          {activeTab === 'users' && actor.permissions.includes('users') && (
            <AdminUsersTab users={users} onReload={reloadCurrentActorData} />
          )}

          {activeTab === 'support' && actor.permissions.includes('support') && (
            <AdminSupportMessagesTab messages={supportMessages} onReload={reloadCurrentActorData} />
          )}

          {activeTab === 'notifications' && actor.permissions.includes('notifications') && (
            <AdminNotificationsTab
              recipients={recipients}
              templates={templates}
              logs={notifLogs}
              onReload={reloadCurrentActorData}
            />
          )}

          {activeTab === 'content' && actor.permissions.includes('content') && content && (
            <AdminContentTab content={content} onReload={reloadCurrentActorData} />
          )}

          {activeTab === 'seo' && actor.permissions.includes('seo') && (
            <AdminSeoTab seoList={seoList} onReload={reloadCurrentActorData} />
          )}

          {activeTab === 'audit' && actor.permissions.includes('audit') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-white">
                  السجل المالي غير القابل للتعديل (Immutable Ledger)
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
                  {ledgerEntries.length === 0 ? (
                    <p className="text-slate-400">لا توجد قيود مالية مسجلة بعد.</p>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl bg-[#040B1A] border border-white/10 p-3 flex justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-white">{entry.description}</p>
                          <p className="text-[10px] text-slate-400">
                            {entry.entry_type} · {formatTripoliDateTime(entry.created_at)}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            entry.direction === 'credit' ? 'text-[#10F5A6]' : 'text-sky-300'
                          }`}
                        >
                          {entry.direction === 'credit' ? '+' : '-'}
                          {Number(entry.amount).toFixed(3)} {entry.currency}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-white">سجل النشاط الإداري (Audit Log)</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
                  {auditLogs.length === 0 ? (
                    <p className="text-slate-400">لا توجد سجلات بعد.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl bg-[#040B1A] border border-white/10 p-3"
                      >
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

          {activeTab === 'staff' && actor.actorType === 'super_admin' && (
            <AdminStaffTab staffList={staffList} onReload={reloadCurrentActorData} />
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent = 'text-white',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#081226] border border-white/10 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-white">{label}</span>
        <span
          className={`px-2 py-0.5 rounded font-bold shrink-0 ${
            ok ? 'bg-emerald-500/15 text-[#10F5A6]' : 'bg-amber-500/15 text-amber-300'
          }`}
        >
          {ok ? 'جاهز ومتصل' : 'غير مهيأ في البيئة'}
        </span>
      </div>
      {!ok && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
