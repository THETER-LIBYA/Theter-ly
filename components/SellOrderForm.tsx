'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Check,
  Copy,
  Hash,
  Landmark,
  Loader2,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type { ExchangeRates, PlatformWallet, User } from '@/lib/types';

export function SellOrderForm({
  rates,
  wallets,
  user,
}: {
  rates: ExchangeRates;
  wallets: PlatformWallet[];
  user: User;
}) {
  const router = useRouter();
  const [usdtAmount, setUsdtAmount] = useState('100');
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');
  const [txHash, setTxHash] = useState('');
  const [recipientFullName, setRecipientFullName] = useState(user.full_name || '');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [needsIban, setNeedsIban] = useState(false);
  const [recipientIban, setRecipientIban] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null;
  const numericUsdt = parseFloat(usdtAmount) || 0;
  const calculatedLyd = Math.round(numericUsdt * Number(rates.sell_rate) * 1000) / 1000;

  const copyAddress = async () => {
    if (!activeWallet) return;
    await navigator.clipboard.writeText(activeWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rates.sell_enabled) {
      setError('خدمة بيع USDT متوقفة مؤقتاً');
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `sell-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch('/api/orders/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usdtAmount: numericUsdt,
          platformWalletId: activeWallet?.id,
          txHash,
          recipientFullName,
          recipientBank,
          recipientAccountNumber,
          recipientIban: needsIban ? recipientIban : '',
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; order?: { id: string }; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || 'تعذر إرسال طلب البيع');
        return;
      }
      router.push(`/orders/${data.order.id}`);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="tl-sell-card rounded-3xl p-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">بيع USDT مباشر</h1>
          <p className="text-xs text-sky-50 mt-1">
            أرسل USDT عبر شبكة TRON (TRC20) واستلم المقابل بالدينار الليبي في حسابك المصرفي
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white text-[#0043BD] flex items-center justify-center shrink-0 shadow-lg">
          <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
        </div>
      </div>

      {!rates.sell_enabled && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-4 text-xs text-amber-200 font-semibold">
          خدمة بيع USDT متوقفة مؤقتاً من قبل الإدارة.
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 p-4 text-xs text-rose-200 font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: USDT Quantity & LYD */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">1. كمية البيع</h2>
            <span className="text-xs text-sky-300 font-semibold tabular-nums">
              سعر البيع: {Number(rates.sell_rate).toFixed(3)} د.ل
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">كمية USDT المرسلة</label>
              <input
                type="number"
                step="0.01"
                min={rates.min_order_usdt}
                max={rates.max_order_usdt}
                required
                dir="ltr"
                value={usdtAmount}
                onChange={(e) => setUsdtAmount(e.target.value)}
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-3 text-lg font-extrabold text-sky-300 tabular-nums focus:outline-none focus:border-sky-400"
              />
              <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                الحد المسموح: {rates.min_order_usdt} – {rates.max_order_usdt} USDT
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">المبلغ المستحق بالدينار (د.ل)</label>
              <div className="w-full rounded-xl bg-[#071124]/80 border border-sky-400/30 px-3.5 py-3 text-lg font-extrabold text-white tabular-nums flex items-center justify-between">
                <span>{calculatedLyd.toFixed(3)}</span>
                <span className="text-xs text-slate-300">د.ل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Platform TRON Wallet & QR Code */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#10F5A6]" />
              <span>2. محفظة المنصة (TRON TRC20)</span>
            </h2>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-[#10F5A6]/35 text-[11px] font-bold text-[#10F5A6]">
              شبكة TRON فقط
            </span>
          </div>

          {wallets.length > 1 && (
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-xs text-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          )}

          {activeWallet ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-[#071124] border border-sky-400/25 p-4">
              {activeWallet.qr_code_url && (
                <div className="p-2 rounded-2xl bg-white shrink-0">
                  <img
                    src={activeWallet.qr_code_url}
                    alt={`QR محفظة ${activeWallet.label}`}
                    className="w-32 h-32 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-right">
                <p className="text-xs font-bold text-sky-300">{activeWallet.label}</p>
                <div
                  dir="ltr"
                  data-copyable="true"
                  className="p-2.5 rounded-xl bg-[#0B1730] border border-white/10 font-mono text-xs text-white break-all"
                >
                  {activeWallet.address}
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400/35 text-xs font-bold text-sky-200 hover:bg-sky-500/30 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#10F5A6]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم نسخ العنوان' : 'نسخ عنوان المحفظة'}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-300">لا توجد محفظة استقبال نشطة حالياً.</p>
          )}
        </div>

        {/* Step 3: TX Hash & Libyan Bank Recipient */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-sky-400" />
            <span>3. بيانات التحويل والحساب المستلم</span>
          </h2>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              معرف المعاملة (Transaction Hash - 64 خانة) *
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                dir="ltr"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value.trim())}
                placeholder="64-character TRON TX Hash"
                className="w-full rounded-xl bg-[#071124] border border-white/15 pl-10 pr-3.5 py-2.5 text-xs font-mono text-white text-left focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">الاسم الثلاثي لصاحب الحساب *</label>
              <input
                type="text"
                required
                value={recipientFullName}
                onChange={(e) => setRecipientFullName(e.target.value)}
                placeholder="الاسم الثلاثي كما في المصرف"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">المصرف *</label>
              <input
                type="text"
                required
                value={recipientBank}
                onChange={(e) => setRecipientBank(e.target.value)}
                placeholder="مثال: مصرف التجارة والتنمية"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">رقم الحساب المصرفي *</label>
            <input
              type="text"
              required
              dir="ltr"
              value={recipientAccountNumber}
              onChange={(e) => setRecipientAccountNumber(e.target.value)}
              placeholder="00123456789"
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white font-mono text-left focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="needs-iban"
              type="checkbox"
              checked={needsIban}
              onChange={(e) => setNeedsIban(e.target.checked)}
              className="w-4 h-4 rounded accent-sky-500"
            />
            <label htmlFor="needs-iban" className="text-xs text-slate-300 cursor-pointer">
              إضافة رقم IBAN (عند الحاجة للتحويل بين المصارف)
            </label>
          </div>

          {needsIban && (
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">رقم الآيبان (IBAN)</label>
              <input
                type="text"
                dir="ltr"
                value={recipientIban}
                onChange={(e) => setRecipientIban(e.target.value.toUpperCase())}
                placeholder="LY..."
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white font-mono text-left focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          <div className="rounded-xl bg-[#071124] border border-white/10 p-3 flex items-center gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              يتم التحقق من وصول المعاملة على شبكة TRON يدوياً بواسطة المشرفين ثم تحويل الدينار الليبي لحسابك المصرفي.
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !rates.sell_enabled}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0E8BFF] to-[#0043BD] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl hover:brightness-105 disabled:opacity-60 transition"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري إرسال طلب البيع...</span>
            </>
          ) : (
            <span>إرسال طلب البيع للمراجعة الإدارية</span>
          )}
        </button>
      </form>
    </div>
  );
}
