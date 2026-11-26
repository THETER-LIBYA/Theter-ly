'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  Building2,
  Check,
  Copy,
  CreditCard,
  Loader2,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import type { ExchangeRates, PaymentAccount, User } from '@/lib/types';

export function BuyOrderForm({
  rates,
  paymentAccounts,
  user,
}: {
  rates: ExchangeRates;
  paymentAccounts: PaymentAccount[];
  user: User;
}) {
  const router = useRouter();
  const [usdtAmount, setUsdtAmount] = useState('100');
  const [selectedMethod, setSelectedMethod] = useState<'lypay' | 'onepay' | 'bank_transfer'>(
    paymentAccounts[0]?.method || 'lypay'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    paymentAccounts.find((a) => a.method === (paymentAccounts[0]?.method || 'lypay'))?.id || ''
  );
  const [senderName, setSenderName] = useState(user.full_name || '');
  const [senderBank, setSenderBank] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [customerWalletAddress, setCustomerWalletAddress] = useState('');
  const [network] = useState('TRC20');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  const availableMethods = useMemo(() => {
    const methods = new Set(paymentAccounts.map((a) => a.method));
    return Array.from(methods);
  }, [paymentAccounts]);

  const accountsForMethod = useMemo(
    () => paymentAccounts.filter((a) => a.method === selectedMethod),
    [paymentAccounts, selectedMethod]
  );

  const activeAccount =
    accountsForMethod.find((a) => a.id === selectedAccountId) || accountsForMethod[0] || null;

  const numericUsdt = parseFloat(usdtAmount) || 0;
  const calculatedLyd = Math.round(numericUsdt * Number(rates.buy_rate) * 1000) / 1000;

  const copyValue = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'receipts');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'فشل رفع الإيصال');
        return;
      }
      setReceiptUrl(data.url);
    } catch {
      setError('حدث خطأ أثناء رفع الإيصال');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rates.buy_enabled) {
      setError('خدمة شراء USDT متوقفة مؤقتاً');
      return;
    }
    if (!receiptUrl) {
      setError('يرجى رفع إيصال الدفع أولاً');
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `buy-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch('/api/orders/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usdtAmount: numericUsdt,
          paymentMethod: selectedMethod,
          bankAccountId: activeAccount?.id,
          senderName,
          senderBank,
          transferReference,
          receiptUrl,
          customerWalletAddress,
          network,
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; order?: { id: string }; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || 'تعذر إرسال طلب الشراء');
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
      {/* Page Title Card */}
      <div className="tl-buy-card rounded-3xl p-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">شراء USDT مباشر</h1>
          <p className="text-xs text-emerald-50 mt-1">
            حوّل بالدينار عبر LYPay أو OnePay واستلم USDT على محفظتك مباشرة
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white text-[#058E69] flex items-center justify-center shrink-0 shadow-lg">
          <ArrowDown className="w-6 h-6 stroke-[2.5]" />
        </div>
      </div>

      {!rates.buy_enabled && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-4 text-xs text-amber-200 font-semibold">
          خدمة شراء USDT متوقفة مؤقتاً من قبل الإدارة.
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-400/40 p-4 text-xs text-rose-200 font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Amount & Auto LYD Calculation */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">1. مبلغ الشراء</h2>
            <span className="text-xs text-[#10F5A6] font-semibold tabular-nums">
              السعر: {Number(rates.buy_rate).toFixed(3)} د.ل
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">المبلغ المطلوب (USDT)</label>
              <input
                type="number"
                step="0.01"
                min={rates.min_order_usdt}
                max={rates.max_order_usdt}
                required
                dir="ltr"
                value={usdtAmount}
                onChange={(e) => setUsdtAmount(e.target.value)}
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-3 text-lg font-extrabold text-[#10F5A6] tabular-nums focus:outline-none focus:border-[#10F5A6]"
              />
              <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                الحد المسموح: {rates.min_order_usdt} – {rates.max_order_usdt} USDT
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">المقابل المطلوب تحويله (د.ل)</label>
              <div className="w-full rounded-xl bg-[#071124]/80 border border-emerald-400/30 px-3.5 py-3 text-lg font-extrabold text-white tabular-nums flex items-center justify-between">
                <span>{calculatedLyd.toFixed(3)}</span>
                <span className="text-xs text-slate-300">د.ل</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                يُحتسب السعر النهائي وتُراجع الحوالة يدوياً من الخادم
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Choose Payment Method & View DB Bank Details */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">2. اختر وسيلة الدفع (LYPay / OnePay)</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(availableMethods.length > 0 ? availableMethods : (['lypay', 'onepay'] as const)).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setSelectedMethod(method);
                  const first = paymentAccounts.find((a) => a.method === method);
                  if (first) setSelectedAccountId(first.id);
                }}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  selectedMethod === method
                    ? 'bg-emerald-500/15 border-[#10F5A6] text-[#10F5A6]'
                    : 'bg-[#071124] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {method === 'lypay' ? 'LYPay' : method === 'onepay' ? 'OnePay' : 'تحويل مصرفي'}
                </span>
              </button>
            ))}
          </div>

          {accountsForMethod.length > 1 && (
            <select
              value={activeAccount?.id || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-xs text-white"
            >
              {accountsForMethod.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} — {acc.account_holder}
                </option>
              ))}
            </select>
          )}

          {activeAccount ? (
            <div className="rounded-2xl bg-[#071124] border border-sky-400/25 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-sky-300 font-bold pb-2 border-b border-white/10">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {activeAccount.bank_name}
                </span>
                <span className="text-[#10F5A6]">{activeAccount.method.toUpperCase()}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">اسم المستفيد:</span>
                <span className="font-bold text-white">{activeAccount.account_holder}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">رقم الحساب:</span>
                <button
                  type="button"
                  onClick={() => copyValue('acc', activeAccount.account_number)}
                  className="inline-flex items-center gap-1.5 font-mono font-bold text-[#10F5A6] hover:underline"
                >
                  <span dir="ltr" data-copyable="true">{activeAccount.account_number}</span>
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {activeAccount.iban && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">IBAN:</span>
                  <button
                    type="button"
                    onClick={() => copyValue('iban', activeAccount.iban!)}
                    className="inline-flex items-center gap-1.5 font-mono text-slate-200 hover:text-white"
                  >
                    <span dir="ltr" data-copyable="true">{activeAccount.iban}</span>
                    {copiedField === 'iban' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {activeAccount.phone_or_id && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">معرف الدفع / الهاتف:</span>
                  <button
                    type="button"
                    onClick={() => copyValue('pid', activeAccount.phone_or_id!)}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-sky-300"
                  >
                    <span dir="ltr" data-copyable="true">{activeAccount.phone_or_id}</span>
                    {copiedField === 'pid' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {activeAccount.instructions && (
                <p className="pt-2 border-t border-white/10 text-[11px] text-amber-200/90 leading-relaxed">
                  {activeAccount.instructions}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-3 text-xs text-rose-200">
              لا توجد حسابات نشطة لوسيلة الدفع المختارة حالياً.
            </div>
          )}
        </div>

        {/* Step 3: Transfer Proof & Sender Info */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">3. بيانات التحويل وإيصال الدفع</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">اسم المحوّل *</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="الاسم الثلاثي لصاحب الحساب"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">المصرف المحوّل منه *</label>
              <input
                type="text"
                required
                value={senderBank}
                onChange={(e) => setSenderBank(e.target.value)}
                placeholder="مثال: مصرف الجمهورية"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10F5A6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">رقم التحويل / الرقم المرجعي *</label>
            <input
              type="text"
              required
              dir="ltr"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
              placeholder="REF-12345678"
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white text-left font-mono focus:outline-none focus:border-[#10F5A6]"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">رفع إيصال الدفع (صورة أو PDF) *</label>
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/35 bg-[#071124]/60 p-5 cursor-pointer hover:border-[#10F5A6] transition">
              {uploading ? (
                <div className="flex items-center gap-2 text-xs text-[#10F5A6]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري رفع الإيصال بأمان...</span>
                </div>
              ) : receiptUrl ? (
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-[#10F5A6]">تم رفع الإيصال بنجاح</p>
                  <p className="text-[11px] text-slate-400">اضغط لتغيير الملف المرفق</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-300">
                  <Upload className="w-6 h-6 text-sky-400" />
                  <span className="text-xs font-semibold">اختر صورة الإيصال (PNG / JPG / PDF)</span>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleReceiptUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Step 4: Receiving Wallet & TRON Network */}
        <div className="tl-glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#10F5A6]" />
              <span>4. محفظة استلام USDT</span>
            </h2>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-[#10F5A6]/35 text-[11px] font-bold text-[#10F5A6]">
              شبكة TRON (TRC20)
            </span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              عنوان محفظة الاستلام (يبدأ بحرف T) *
            </label>
            <input
              type="text"
              required
              dir="ltr"
              value={customerWalletAddress}
              onChange={(e) => setCustomerWalletAddress(e.target.value)}
              placeholder="T..."
              className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-3 text-sm text-white font-mono text-left focus:outline-none focus:border-[#10F5A6]"
            />
          </div>

          <div className="rounded-xl bg-[#071124] border border-white/10 p-3 flex items-center gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-[#10F5A6] shrink-0" />
            <span>
              تتم مراجعة الإيصال والتحقق من الإيداع المصرفي يدوياً من قبل المشرفين قبل إرسال USDT إلى محفظتك.
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading || !rates.buy_enabled}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0CD494] to-[#059669] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-xl hover:brightness-105 disabled:opacity-60 transition"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري إرسال الطلب...</span>
            </>
          ) : (
            <span>إرسال طلب الشراء للمراجعة الإدارية</span>
          )}
        </button>
      </form>
    </div>
  );
}
