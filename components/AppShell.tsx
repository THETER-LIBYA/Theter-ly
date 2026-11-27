'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Home,
  Info,
  Lock,
  Menu,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import type { AppNotification, SiteContent, User } from '@/lib/types';

interface AppShellProps {
  children: React.ReactNode;
  siteContent?: SiteContent | null;
  user?: User | null;
  unreadNotifications?: number;
  hideChrome?: boolean;
  hideBottomNav?: boolean;
}

function isTargetCopyAllowed(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  ) {
    return true;
  }
  return Boolean(target.closest('[data-copyable="true"], input, textarea'));
}

export function AppShell({
  children,
  siteContent,
  user,
  unreadNotifications = 0,
  hideChrome = false,
  hideBottomNav = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showSmartInstallBar, setShowSmartInstallBar] = useState(false);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(false);
  const [polledUnread, setPolledUnread] = useState<number | null>(null);
  const [liveToast, setLiveToast] = useState<{ title: string; body: string; url: string } | null>(null);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isOnline,
    updateAvailable,
    pushSupported,
    pushPermission,
    isPushSubscribed,
    syncingPush,
    installApp,
    applyUpdate,
    subscribeToPush,
  } = usePWA({ userId: user?.id });

  const appNameAr = siteContent?.app_name_ar || 'تيتر ليبيا';
  const appNameEn = siteContent?.app_name_en || 'Tether Libya';
  const taglineAr = siteContent?.tagline_ar || 'آمن .. سريع .. بكل ثقة';
  const logoUrl = siteContent?.logo_url || '/images/brand-icon.png';
  const isLockedGate = Boolean(
    hideBottomNav || !user || !user.terms_accepted_at || !user.onboarding_completed
  );
  const activeUnreadCount = polledUnread ?? unreadNotifications;

  const refreshLiveNotifications = useCallback(async (showBannerOnNew: boolean) => {
    if (!user?.id || isLockedGate) return;
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: AppNotification[];
        unreadCount?: number;
      };
      if (typeof data.unreadCount === 'number') {
        setPolledUnread(data.unreadCount);
      }
      const list = data.notifications || [];
      const newest = list[0];
      if (newest) {
        const prevSeen = lastSeenNotifIdRef.current;
        lastSeenNotifIdRef.current = newest.id;
        if (showBannerOnNew && prevSeen && prevSeen !== newest.id && !newest.is_read) {
          setLiveToast({
            title: newest.title,
            body: newest.body,
            url: newest.action_url || '/notifications',
          });
        }
      }
      window.dispatchEvent(new CustomEvent('tl:notifications-updated', { detail: data }));
    } catch {
      // Ignore transient network errors
    }
  }, [user?.id, isLockedGate]);

  useEffect(() => {
    if (!user?.id || isLockedGate) return;

    const initialTimer = setTimeout(() => {
      void refreshLiveNotifications(false);
    }, 350);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshLiveNotifications(true);
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshLiveNotifications(true);
      }
    };
    const onManualRefresh = () => {
      void refreshLiveNotifications(true);
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    window.addEventListener('tl:refresh-notifications', onManualRefresh);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('tl-notifications');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'TL_PUSH_RECEIVED') {
          const n = ev.data.notification as { title?: string; body?: string; url?: string } | undefined;
          if (n?.title) {
            setLiveToast({
              title: n.title,
              body: n.body || '',
              url: n.url || '/notifications',
            });
          }
          void refreshLiveNotifications(false);
        }
      };
    }

    const onSwMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'TL_PUSH_RECEIVED') {
        void refreshLiveNotifications(true);
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.removeEventListener('tl:refresh-notifications', onManualRefresh);
      if (bc) bc.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, [user?.id, isLockedGate, refreshLiveNotifications]);

  useEffect(() => {
    if (!liveToast) return;
    const t = setTimeout(() => setLiveToast(null), 6500);
    return () => clearTimeout(t);
  }, [liveToast]);

  useEffect(() => {
    if (pwaDismissed || isInstalled || (!isInstallable && !isIOS)) return;
    const timer = setTimeout(() => {
      setShowSmartInstallBar(true);
    }, 14000);
    return () => clearTimeout(timer);
  }, [pwaDismissed, isInstalled, isInstallable, isIOS]);

  const dismissInstallBar = () => {
    setShowSmartInstallBar(false);
    setPwaDismissed(true);
  };

  const handleCopyGuard = (e: React.ClipboardEvent) => {
    if (!isTargetCopyAllowed(e.target)) {
      e.preventDefault();
    }
  };

  const handleContextMenuGuard = (e: React.MouseEvent) => {
    if (!isTargetCopyAllowed(e.target)) {
      e.preventDefault();
    }
  };

  if (hideChrome) {
    return (
      <div
        className="tl-no-copy min-h-dvh"
        onCopy={handleCopyGuard}
        onCut={handleCopyGuard}
        onContextMenu={handleContextMenuGuard}
      >
        {children}
      </div>
    );
  }

  const navItems = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/stats', label: 'الإحصائيات', icon: BarChart3 },
    { href: '/wallet', label: 'المحفظة', icon: Wallet },
    { href: '/account', label: 'حسابي', icon: UserIcon },
  ];

  const pagesMap = siteContent?.public_pages_json || {};
  const isPageVisible = (slug: string) => pagesMap[slug]?.is_visible !== false;

  const drawerLinks = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/buy', label: 'شراء USDT', icon: ArrowDownLeft },
    { href: '/sell', label: 'بيع USDT', icon: ArrowUpRight },
    { href: '/orders', label: 'سجل العمليات', icon: FileText },
    { href: '/notifications', label: 'مركز الإشعارات', icon: Bell },
    ...(isPageVisible('how-it-works') ? [{ href: '/how-it-works', label: 'آلية الشراء والبيع', icon: HelpCircle }] : []),
    ...(isPageVisible('security') ? [{ href: '/security', label: 'الأمان والموثوقية', icon: ShieldCheck }] : []),
    ...(isPageVisible('rewards') ? [{ href: '/rewards', label: 'المكافآت والعروض', icon: Sparkles }] : []),
    ...(isPageVisible('about') ? [{ href: '/about', label: 'من نحن', icon: Info }] : []),
    ...(isPageVisible('faq') ? [{ href: '/faq', label: 'الأسئلة الشائعة', icon: HelpCircle }] : []),
    ...(isPageVisible('contact') ? [{ href: '/contact', label: 'اتصل بنا والدعم', icon: Phone }] : []),
    ...(isPageVisible('terms') ? [{ href: '/terms', label: 'الشروط والأحكام', icon: FileText }] : []),
    ...(isPageVisible('privacy') ? [{ href: '/privacy', label: 'سياسة الخصوصية', icon: Lock }] : []),
    ...(isPageVisible('risk-disclosure') ? [{ href: '/risk-disclosure', label: 'الإفصاحات والمخاطر', icon: ShieldCheck }] : []),
  ];

  return (
    <div
      className="min-h-dvh flex flex-col relative tl-no-copy"
      onCopy={handleCopyGuard}
      onCut={handleCopyGuard}
      onContextMenu={handleContextMenuGuard}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-amber-600/95 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 backdrop-blur-md">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>أنت غير متصل بالإنترنت حالياً — يتم عرض الموارد المحفوظة فقط</span>
        </div>
      )}

      {/* SW Update Available */}
      {updateAvailable && (
        <div className="sticky top-0 z-50 bg-emerald-600/95 text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 backdrop-blur-md">
          <span className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            يتوفر تحديث جديد لتطبيق {appNameAr}
          </span>
          <button
            onClick={applyUpdate}
            className="px-3 py-1 rounded-lg bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition whitespace-nowrap"
          >
            تحديث الآن
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <div className={`flex-1 w-full max-w-lg lg:max-w-5xl mx-auto px-4 pt-3 ${isLockedGate ? 'pb-8' : 'pb-24'}`}>
        {/* Top Bar matching reference */}
        <header className={`flex items-center gap-2 pt-1 pb-2 ${isLockedGate ? 'justify-center' : 'justify-between'}`}>
          {!isLockedGate && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="w-11 h-11 rounded-2xl bg-[#0D1A33]/90 border border-white/10 flex items-center justify-center text-slate-100 hover:border-emerald-400/40 active:scale-95 transition shadow-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {isLockedGate ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  {appNameAr}
                </div>
                <div className="text-[11px] font-medium tracking-wide text-slate-300 font-[family-name:var(--font-latin)] leading-tight">
                  {appNameEn}
                </div>
              </div>
              <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#10F5A6] via-[#2DD4BF] to-[#0D8BFF] shadow-[0_0_20px_rgba(16,245,166,0.38)] shrink-0">
                <img
                  src={logoUrl}
                  alt={appNameAr}
                  draggable={false}
                  className="w-full h-full rounded-full object-cover bg-[#050B18]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  {appNameAr}
                </div>
                <div className="text-[11px] font-medium tracking-wide text-slate-300 font-[family-name:var(--font-latin)] leading-tight">
                  {appNameEn}
                </div>
              </div>
              <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#10F5A6] via-[#2DD4BF] to-[#0D8BFF] shadow-[0_0_20px_rgba(16,245,166,0.38)] shrink-0">
                <img
                  src={logoUrl}
                  alt={appNameAr}
                  draggable={false}
                  className="w-full h-full rounded-full object-cover bg-[#050B18]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </Link>
          )}

          {!isLockedGate && (
            <Link
              href="/notifications"
              aria-label="مركز الإشعارات"
              className="relative w-11 h-11 rounded-2xl bg-[#0D1A33]/90 border border-white/10 flex items-center justify-center text-slate-100 hover:border-emerald-400/40 active:scale-95 transition shadow-lg"
            >
              <Bell className="w-5 h-5" />
              {user && activeUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md tabular-nums">
                  {activeUnreadCount > 99 ? '99+' : activeUnreadCount}
                </span>
              )}
            </Link>
          )}
        </header>

        {/* Real-Time In-App Notification Toast */}
        {!isLockedGate && liveToast && (
          <div className="fixed top-3 left-4 right-4 max-w-md mx-auto z-50 rounded-2xl bg-[#0B1C38]/95 border border-[#10F5A6]/45 p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-start justify-between gap-3">
            <Link
              href={liveToast.url || '/notifications'}
              onClick={() => setLiveToast(null)}
              className="flex items-start gap-2.5 min-w-0 flex-1"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#10F5A6] flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white truncate">{liveToast.title}</p>
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{liveToast.body}</p>
              </div>
            </Link>
            <button
              type="button"
              aria-label="إغلاق التنبيه"
              onClick={() => setLiveToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tagline row */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-[1px] flex-1 max-w-[72px] bg-gradient-to-r from-sky-400/70 to-transparent" />
          <p className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide whitespace-nowrap">
            {taglineAr}
          </p>
          <div className="h-[1px] flex-1 max-w-[72px] bg-gradient-to-l from-sky-400/70 to-transparent" />
        </div>

        {/* One-tap External Push Opt-in Banner for Authenticated Users */}
        {!isLockedGate && pushSupported && pushPermission === 'default' && !isPushSubscribed && !pushPromptDismissed && (
          <div className="mb-4 rounded-2xl bg-[#0B1A33]/90 border border-sky-400/30 px-3.5 py-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-200 leading-snug">
                فعّل الإشعارات الفورية لتصلك تحديثات الطلبات في أعلى الهاتف حتى عند إغلاق التطبيق.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={syncingPush}
                onClick={async () => {
                  const res = await subscribeToPush();
                  if (res.ok) setPushPromptDismissed(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#10F5A6] text-slate-950 font-bold text-xs hover:bg-emerald-400 transition whitespace-nowrap disabled:opacity-60"
              >
                {syncingPush ? 'جاري...' : 'تفعيل'}
              </button>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setPushPromptDismissed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main>{children}</main>
      </div>

      {/* Smart Non-Intrusive PWA Install Pill */}
      {!isLockedGate && showSmartInstallBar && !isInstalled && (isInstallable || isIOS) && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 rounded-2xl bg-[#0C1B36]/95 border border-emerald-400/35 p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoUrl}
              alt={appNameAr}
              draggable={false}
              className="w-9 h-9 rounded-xl object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">تثبيت تطبيق {appNameAr}</p>
              <p className="text-[11px] text-slate-300 truncate">وصول أسرع وإشعارات فورية</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isInstallable) {
                  installApp();
                } else if (isIOS) {
                  setShowIOSGuide(true);
                }
                setShowSmartInstallBar(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition whitespace-nowrap"
            >
              تثبيت
            </button>
            <button
              type="button"
              onClick={dismissInstallBar}
              aria-label="إغلاق"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      {!isLockedGate && (
        <nav
          aria-label="التنقل السفلي"
          className="fixed bottom-0 left-0 right-0 z-30 tl-bottom-nav"
        >
          <div className="max-w-lg lg:max-w-5xl mx-auto grid grid-cols-4 h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
                >
                  {active && (
                    <span className="absolute top-0 w-10 h-0.5 rounded-full bg-[#10F5A6] shadow-[0_0_10px_#10F5A6]" />
                  )}
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      active ? 'text-[#10F5A6]' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      active ? 'text-[#10F5A6]' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Side Drawer */}
      {!isLockedGate && drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 w-80 max-w-[85vw] h-full bg-[#071124] border-l border-white/10 p-5 flex flex-col overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoUrl}
                  alt={appNameAr}
                  draggable={false}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-400/40"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-sm font-bold text-white">{appNameAr}</p>
                  <p className="text-[11px] text-slate-400 font-[family-name:var(--font-latin)]">
                    {appNameEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="إغلاق القائمة"
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="mt-4 p-3 rounded-2xl bg-[#0C1933] border border-sky-400/20 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {user.kyc_status === 'verified'
                      ? 'حسابك موثق'
                      : user.kyc_status === 'needs_reverification'
                        ? 'مطلوب إعادة توثيق'
                        : 'مسجل الدخول'}
                  </p>
                </div>
                <Link
                  href="/account"
                  onClick={() => setDrawerOpen(false)}
                  className="text-xs text-sky-400 font-semibold whitespace-nowrap"
                >
                  حسابي
                </Link>
              </div>
            )}

            <nav className="mt-4 space-y-1 flex-1">
              {drawerLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? 'bg-emerald-500/15 text-[#10F5A6] border border-emerald-500/25'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  if (isInstallable) installApp();
                  else setShowIOSGuide(true);
                }}
                className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق على الهاتف</span>
              </button>
            )}
          </aside>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0A1730] border border-sky-400/25 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">تثبيت {appNameAr} على iPhone / iPad</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-300 list-decimal list-inside leading-relaxed">
              <li>اضغط على زر المشاركة (Share) في شريط Safari بالأسفل.</li>
              <li>مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</li>
              <li>اضغط <strong>إضافة</strong> ليظهر التطبيق على جهازك كتطبيق مستقل.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
