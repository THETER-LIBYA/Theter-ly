'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Gift,
  Headphones,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { AppShell } from './AppShell';
import { formatNumberEn, formatTripoliDateParts } from '@/lib/format';
import type { ExchangeRates, Order, SiteContent, User } from '@/lib/types';

interface HomeDashboardProps {
  initialRates: ExchangeRates;
  siteContent: SiteContent;
  user: User | null;
  recentOrders: Order[];
  unreadNotifications: number;
}

const ORDER_STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  completed: {
    label: 'مكتملة',
    bg: 'bg-[#064E3B]/80',
    text: 'text-[#10F5A6]',
    border: 'border-[#10F5A6]/35',
  },
  approved: {
    label: 'معتمد',
    bg: 'bg-sky-950/80',
    text: 'text-sky-300',
    border: 'border-sky-400/35',
  },
  under_review: {
    label: 'تحت المراجعة',
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-400/35',
  },
  pending_review: {
    label: 'قيد المراجعة',
    bg: 'bg-amber-950/70',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
  },
  needs_edit: {
    label: 'يتطلب تعديل',
    bg: 'bg-orange-950/80',
    text: 'text-orange-300',
    border: 'border-orange-400/35',
  },
  rejected: {
    label: 'مرفوضة',
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-400/35',
  },
  cancelled: {
    label: 'ملغاة',
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-600/40',
  },
};

function formatOrderDate(iso: string) {
  return formatTripoliDateParts(iso);
}

function formatMethodLabel(order: Order) {
  if (order.type === 'sell') return 'عبر شبكة TRON';
  if (order.payment_method === 'lypay') return 'من خلال LYPay';
  if (order.payment_method === 'onepay') return 'من خلال OnePay';
  return 'تحويل مصرفي';
}

export function HomeDashboard({
  initialRates,
  siteContent,
  user,
  recentOrders,
  unreadNotifications,
}: HomeDashboardProps) {
  const [rates, setRates] = useState<ExchangeRates>(initialRates);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshRates = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch('/api/rates?refresh=1');
      if (res.ok) {
        const data = (await res.json()) as { rates?: ExchangeRates };
        if (data.rates) setRates(data.rates);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const shortcuts = [
    { href: '/orders', label: 'سجل العمليات', icon: FileText, color: 'text-[#0D8BFF]' },
    { href: '/support', label: 'الدعم الفني', icon: Headphones, color: 'text-[#38BDF8]' },
    { href: '/security', label: 'أمان وموثوقية', icon: ShieldCheck, color: 'text-[#10F5A6]' },
    { href: '/rewards', label: 'مكافآت وعروض', icon: Gift, color: 'text-[#0D8BFF]' },
  ];

  return (
    <AppShell
      siteContent={siteContent}
      user={user}
      unreadNotifications={unreadNotifications}
    >
      {siteContent.maintenance_mode && (
        <div className="mb-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 p-3.5 text-center text-xs sm:text-sm text-amber-200 font-semibold">
          {siteContent.maintenance_message}
        </div>
      )}

      {user?.kyc_status === 'needs_reverification' && (
        <Link
          href="/account?reverify=1"
          className="mb-4 rounded-2xl bg-rose-500/15 border border-rose-400/45 p-3.5 flex items-center justify-between gap-3 hover:bg-rose-500/20 transition"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-rose-200">
                تنبيه: مطلوب إعادة توثيق المستندات (جواز السفر / شهادة الميلاد)
              </p>
              <p className="text-[11px] text-rose-100/85 truncate mt-0.5">
                {user.kyc_note || 'اضغط هنا لإعادة رفع صور واضحة من ملفك الشخصي.'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0">
            تحديث الآن
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Primary Visual Column */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Welcome & Verification Card */}
          <Link
            href={user ? '/account' : '/login'}
            className="tl-glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 hover:border-sky-400/35 transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] ring-2 ring-sky-300/30 flex items-center justify-center shrink-0 shadow-lg">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-bold text-white truncate">
                    {user ? `مرحباً، ${user.full_name}` : 'مرحباً بك في ZarnixPay'}
                  </h1>
                  {user?.kyc_status === 'verified' && (
                    <CheckCircle2 className="w-4 h-4 text-[#10F5A6] shrink-0 fill-[#10F5A6]/20" />
                  )}
                </div>
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    user?.kyc_status === 'needs_reverification'
                      ? 'text-rose-300'
                      : user?.kyc_status === 'pending'
                        ? 'text-amber-300'
                        : 'text-[#10F5A6]'
                  }`}
                >
                  {user
                    ? user.kyc_status === 'verified'
                      ? 'حسابك موثق'
                      : user.kyc_status === 'needs_reverification'
                        ? 'مطلوب إعادة توثيق المستندات'
                        : user.kyc_status === 'pending'
                          ? 'مستنداتك قيد المراجعة — حسابك مفتوح'
                          : 'حساب نشط — اضغط لاستكمال التوثيق'
                    : 'اضغط لتسجيل الدخول عبر رمز التحقق'}
                </p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          </Link>

          {/* Currency Rates Card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            aria-label="أسعار الصرف المباشرة"
            className="tl-rate-card rounded-3xl p-4 sm:p-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleRefreshRates}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-[#10F5A6]/40 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/80 transition"
              >
                <span className="w-2 h-2 rounded-full bg-[#10F5A6]" />
                <span>{rates.source === 'manual' ? 'سعر معتمد' : 'محدث الآن'}</span>
                <RefreshCw className={`w-3.5 h-3.5 text-[#10F5A6] ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <div className="flex items-end gap-1 text-[#10F5A6]/90" aria-hidden="true">
                <div className="flex flex-col items-end">
                  <TrendingUp className="w-8 h-8 stroke-[2.5] drop-shadow-[0_0_10px_rgba(16,245,166,0.6)]" />
                  <div className="flex items-end gap-1 -mt-2">
                    <span className="w-1.5 h-2.5 rounded-t bg-[#10F5A6]/80" />
                    <span className="w-1.5 h-4 rounded-t bg-[#10F5A6]/90" />
                    <span className="w-1.5 h-6 rounded-t bg-[#10F5A6]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 items-center my-4 relative">
              <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/15" />

              {/* Buy Rate (Right in RTL) */}
              <div className="text-center px-2">
                <p className="text-xs sm:text-sm font-semibold text-slate-200">سعر الشراء</p>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold text-[#10F5A6] tabular-nums tracking-tight font-[family-name:var(--font-latin)]">
                  {Number(rates.buy_rate).toFixed(3)}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
                  <span>د.ل</span>
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-[#10F5A6]/40 flex items-center justify-center text-[#10F5A6]">
                    <ArrowUp className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Sell Rate (Left in RTL) */}
              <div className="text-center px-2">
                <p className="text-xs sm:text-sm font-semibold text-slate-200">سعر البيع</p>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight font-[family-name:var(--font-latin)]">
                  {Number(rates.sell_rate).toFixed(3)}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
                  <span>د.ل</span>
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400">
                    <ArrowDown className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] sm:text-xs text-slate-200/90 font-medium">
              سعر الصرف المباشر في السوق الليبي + هامش المنصة
            </p>
          </motion.section>

          {/* Two Primary Action Cards: Buy & Sell USDT */}
          <div className="grid grid-cols-2 gap-3.5">
            {(() => {
              const canBuy = rates.buy_enabled && !siteContent.maintenance_mode;
              const canSell = rates.sell_enabled && !siteContent.maintenance_mode;
              return (
                <>
                  <Link
                    href={canBuy ? '/buy' : '#'}
                    aria-disabled={!canBuy}
                    className={`tl-buy-card rounded-3xl p-4 flex flex-col items-center text-center transition active:scale-[0.98] ${
                      !canBuy ? 'opacity-60 pointer-events-none' : 'hover:brightness-105'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-white text-[#058E69] flex items-center justify-center shadow-md mb-2.5">
                      <ArrowDown className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base sm:text-lg font-extrabold text-white whitespace-nowrap">
                        شراء USDT
                      </span>
                      <span className="w-5 h-5 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-white">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-emerald-50 font-medium">
                      {siteContent.maintenance_mode
                        ? 'المنصة قيد الصيانة'
                        : rates.buy_enabled
                          ? 'حول دينارك واستلم USDT'
                          : 'الشراء متوقف مؤقتاً'}
                    </p>
                  </Link>

                  <Link
                    href={canSell ? '/sell' : '#'}
                    aria-disabled={!canSell}
                    className={`tl-sell-card rounded-3xl p-4 flex flex-col items-center text-center transition active:scale-[0.98] ${
                      !canSell ? 'opacity-60 pointer-events-none' : 'hover:brightness-105'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-white text-[#0043BD] flex items-center justify-center shadow-md mb-2.5">
                      <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base sm:text-lg font-extrabold text-white whitespace-nowrap">
                        بيع USDT
                      </span>
                      <span className="w-5 h-5 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-white">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-sky-50 font-medium">
                      {siteContent.maintenance_mode
                        ? 'المنصة قيد الصيانة'
                        : rates.sell_enabled
                          ? 'أرسل USDT واستلم دينارك'
                          : 'البيع متوقف مؤقتاً'}
                    </p>
                  </Link>
                </>
              );
            })()}
          </div>

          {/* Four Quick Shortcuts */}
          <div className="grid grid-cols-4 gap-2.5">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tl-shortcut-card rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-2 text-center hover:border-sky-400/40 active:scale-95 transition min-h-[76px]"
                >
                  <Icon className={`w-6 h-6 ${item.color}`} />
                  <span className="text-[11px] font-semibold text-slate-200 leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Promotional Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-indigo-400/40 shadow-[0_12px_30px_rgba(0,0,0,0.5)] min-h-[104px] flex items-center justify-center bg-[#060E20]">
            <img
              src={siteContent.promo_banner_image_url || '/images/promo-banner.jpg'}
              alt={`${siteContent.promo_banner_title} ${siteContent.promo_banner_subtitle}`}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover opacity-90"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060F24]/30 via-[#050C1E]/75 to-[#060F24]/35" />
            <div className="relative z-10 text-center px-6 py-3">
              <p className="text-lg sm:text-xl font-extrabold text-white drop-shadow">
                {siteContent.promo_banner_title}
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-[#10F5A6] drop-shadow leading-tight">
                {siteContent.promo_banner_subtitle}
              </p>
              <svg
                className="w-28 h-2.5 mx-auto mt-1 text-amber-400"
                viewBox="0 0 120 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 9C35 2 85 2 116 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Latest Operations */}
          <section aria-label="آخر العمليات" className="pt-1">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-slate-300" />
                <h2 className="text-sm sm:text-base font-bold">آخر العمليات</h2>
              </div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="space-y-2.5">
                {recentOrders.slice(0, 3).map((order) => {
                  const { dateStr, timeStr } = formatOrderDate(order.created_at);
                  const badge = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending_review;
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="tl-glass-card rounded-2xl px-3.5 py-3 flex items-center justify-between gap-2.5 hover:border-emerald-400/35 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-[#10F5A6] shrink-0">
                          {order.type === 'buy' ? (
                            <ShoppingCart className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 tabular-nums font-[family-name:var(--font-latin)] leading-tight shrink-0">
                          <div>{dateStr}</div>
                          <div className="text-slate-400">{timeStr}</div>
                        </div>
                      </div>

                      <div className="h-7 w-px bg-white/10 shrink-0" />

                      <div className="text-center shrink-0">
                        <div className="text-sm sm:text-base font-extrabold text-[#10F5A6] tabular-nums font-[family-name:var(--font-latin)]">
                          {Number(order.usdt_amount).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">USDT</div>
                      </div>

                      <div className="h-7 w-px bg-white/10 shrink-0" />

                      <div className="min-w-0 text-right">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {order.type === 'buy' ? 'شراء USDT' : 'بيع USDT'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {formatMethodLabel(order)}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="tl-glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    {user ? 'لا توجد عمليات مسجلة بعد' : 'سجل دخولك لمتابعة عملياتك'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {user
                      ? 'يمكنك بدء عملية شراء أو بيع مباشرة دون محفظة داخلية.'
                      : 'تحقق برقم هاتفك عبر رمز التحقق لإنشاء ومتابعة طلباتك.'}
                  </p>
                </div>
                <Link
                  href={user ? '/buy' : '/login'}
                  className="px-4 py-2 rounded-xl bg-[#10F5A6] text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 hover:bg-emerald-400 transition"
                >
                  {user ? 'ابدأ الآن' : 'تسجيل الدخول'}
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Desktop Companion Panel */}
        <aside className="hidden lg:block lg:col-span-5 space-y-4">
          <div className="tl-glass-card rounded-3xl p-5 space-y-4">
            <h2 className="text-base font-extrabold text-white">تداول مباشر بدون محفظة داخلية</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              تتم جميع عمليات الشراء والبيع في {siteContent.app_name_ar} مباشرة بين محفظتك على شبكة TRON (TRC20) وحسابك المصرفي عبر LYPay أو OnePay، مع مراجعة يدوية دقيقة لكل معاملة لضمان أعلى درجات الأمان.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl bg-[#071124] border border-white/10 p-3">
                <div className="text-[11px] text-slate-400">الحد الأدنى للطلب</div>
                <div className="text-base font-bold text-white tabular-nums mt-0.5">
                  {rates.min_order_usdt} USDT
                </div>
              </div>
              <div className="rounded-2xl bg-[#071124] border border-white/10 p-3">
                <div className="text-[11px] text-slate-400">الحد الأقصى للطلب</div>
                <div className="text-base font-bold text-white tabular-nums mt-0.5">
                  {formatNumberEn(rates.max_order_usdt)} USDT
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex flex-wrap gap-3 text-xs text-slate-300">
              {[
                { slug: 'how-it-works', label: 'آلية الشراء والبيع' },
                { slug: 'about', label: 'من نحن' },
                { slug: 'faq', label: 'الأسئلة الشائعة' },
                { slug: 'terms', label: 'الشروط والأحكام' },
                { slug: 'privacy', label: 'سياسة الخصوصية' },
                { slug: 'risk-disclosure', label: 'الإفصاحات والمخاطر' },
              ]
                .filter((p) => siteContent.public_pages_json?.[p.slug]?.is_visible !== false)
                .map((p, idx, arr) => (
                  <React.Fragment key={p.slug}>
                    <Link href={`/${p.slug}`} className="hover:text-[#10F5A6] transition">
                      {p.label}
                    </Link>
                    {idx < arr.length - 1 && <span>·</span>}
                  </React.Fragment>
                ))}
            </div>
          </div>

          <div className="tl-glass-card rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">روابط سريعة ومساعدة</h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link
                href="/notifications"
                className="rounded-xl bg-[#071124] border border-white/10 px-3 py-2.5 text-slate-200 hover:border-emerald-400/40 transition flex items-center justify-between"
              >
                <span>مركز الإشعارات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/contact"
                className="rounded-xl bg-[#071124] border border-white/10 px-3 py-2.5 text-slate-200 hover:border-emerald-400/40 transition flex items-center justify-between"
              >
                <span>اتصل بنا والدعم</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/stats"
                className="rounded-xl bg-[#071124] border border-white/10 px-3 py-2.5 text-slate-200 hover:border-emerald-400/40 transition flex items-center justify-between"
              >
                <span>الإحصائيات المباشرة</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-xl bg-[#071124] border border-white/10 px-3 py-2.5 text-slate-200 hover:border-emerald-400/40 transition flex items-center justify-between"
              >
                <span>آلية الشراء والبيع</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
