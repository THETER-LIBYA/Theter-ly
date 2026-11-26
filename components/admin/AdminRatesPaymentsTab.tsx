'use client';

import React, { useState } from 'react';
import { Check, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import type { ExchangeRates, PaymentAccount, PlatformWallet } from '@/lib/types';

export function AdminRatesTab({
  rates: initialRates,
  onReload,
}: {
  rates: ExchangeRates;
  onReload: () => void;
}) {
  const [msg, setMsg] = useState('');
  const syncKey = `${initialRates.last_fetched_at}-${initialRates.source}-${initialRates.buy_rate}-${initialRates.sell_rate}-${initialRates.buy_enabled}-${initialRates.sell_enabled}-${initialRates.min_order_usdt}-${initialRates.max_order_usdt}`;

  return (
    <RatesEditorBody
      key={syncKey}
      initialRates={initialRates}
      msg={msg}
      setMsg={setMsg}
      onReload={onReload}
    />
  );
}

function RatesEditorBody({
  initialRates,
  msg,
  setMsg,
  onReload,
}: {
  initialRates: ExchangeRates;
  msg: string;
  setMsg: (val: string) => void;
  onReload: () => void;
}) {
  const [rates, setRates] = useState(initialRates);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveRates = async (syncNow = false) => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          syncNow
            ? { syncNow: true, notifyUsers }
            : {
                source: rates.source,
                base_usd_lyd: Number(rates.base_usd_lyd),
                buy_margin: Number(rates.buy_margin),
                sell_margin: Number(rates.sell_margin),
                buy_rate: Number(rates.buy_rate),
                sell_rate: Number(rates.sell_rate),
                auto_update_enabled: rates.auto_update_enabled,
                buy_enabled: rates.buy_enabled,
                sell_enabled: rates.sell_enabled,
                min_order_usdt: Number(rates.min_order_usdt),
                max_order_usdt: Number(rates.max_order_usdt),
                notifyUsers,
              }
        ),
      });
      const data = (await res.json()) as { rates?: ExchangeRates; error?: string };
      if (res.ok && data.rates) {
        setRates(data.rates);
        setMsg(syncNow ? 'تمت المزامنة مع Prices.ly وتحديث الأسعار.' : 'تم حفظ إعدادات التسعير بنجاح.');
        onReload();
      } else {
        setMsg(data.error || 'تعذر حفظ التسعير');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tl-glass-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-base font-extrabold text-white">إدارة التسعير ومصدر Prices.ly</h2>
          <p className="text-xs text-slate-400">
            آخر تحديث: {formatTripoliDateTime(rates.last_fetched_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveRates(true)}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>مزامنة فورية مع Prices.ly</span>
        </button>
      </div>

      {msg && <p className="text-xs text-[#10F5A6] font-semibold">{msg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1">مصدر التسعير</label>
          <select
            value={rates.source}
            onChange={(e) => setRates({ ...rates, source: e.target.value as 'prices_ly' | 'manual' })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white"
          >
            <option value="prices_ly">Prices.ly + هامش المنصة</option>
            <option value="manual">تحديد يدوي مباشر</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-300 mb-1">السعر الأساسي (USD/LYD)</label>
          <input
            type="number"
            step="0.001"
            dir="ltr"
            value={rates.base_usd_lyd}
            onChange={(e) => setRates({ ...rates, base_usd_lyd: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white tabular-nums"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#071124] border border-white/15 w-full cursor-pointer">
            <input
              type="checkbox"
              checked={rates.auto_update_enabled}
              onChange={(e) => setRates({ ...rates, auto_update_enabled: e.target.checked })}
              className="accent-[#10F5A6]"
            />
            <span className="text-white">تفعيل التحديث التلقائي</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1">هامش الشراء (+)</label>
          <input
            type="number"
            step="0.001"
            dir="ltr"
            value={rates.buy_margin}
            onChange={(e) => setRates({ ...rates, buy_margin: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-[#10F5A6] tabular-nums"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">هامش البيع (-)</label>
          <input
            type="number"
            step="0.001"
            dir="ltr"
            value={rates.sell_margin}
            onChange={(e) => setRates({ ...rates, sell_margin: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sky-300 tabular-nums"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">سعر الشراء النهائي</label>
          <input
            type="number"
            step="0.001"
            dir="ltr"
            disabled={rates.source !== 'manual'}
            value={rates.source === 'manual' ? rates.buy_rate : (Number(rates.base_usd_lyd) + Number(rates.buy_margin)).toFixed(3)}
            onChange={(e) => setRates({ ...rates, buy_rate: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white tabular-nums disabled:opacity-70"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">سعر البيع النهائي</label>
          <input
            type="number"
            step="0.001"
            dir="ltr"
            disabled={rates.source !== 'manual'}
            value={rates.source === 'manual' ? rates.sell_rate : (Number(rates.base_usd_lyd) + Number(rates.sell_margin)).toFixed(3)}
            onChange={(e) => setRates({ ...rates, sell_rate: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white tabular-nums disabled:opacity-70"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1">أقل مبلغ (USDT)</label>
          <input
            type="number"
            dir="ltr"
            value={rates.min_order_usdt}
            onChange={(e) => setRates({ ...rates, min_order_usdt: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white tabular-nums"
          />
        </div>
        <div>
          <label className="block text-slate-300 mb-1">أعلى مبلغ (USDT)</label>
          <input
            type="number"
            dir="ltr"
            value={rates.max_order_usdt}
            onChange={(e) => setRates({ ...rates, max_order_usdt: Number(e.target.value) })}
            className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-white tabular-nums"
          />
        </div>
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#071124] border border-white/15 cursor-pointer self-end">
          <input
            type="checkbox"
            checked={rates.buy_enabled}
            onChange={(e) => setRates({ ...rates, buy_enabled: e.target.checked })}
            className="accent-[#10F5A6]"
          />
          <span className="text-white">تفعيل الشراء</span>
        </label>
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#071124] border border-white/15 cursor-pointer self-end">
          <input
            type="checkbox"
            checked={rates.sell_enabled}
            onChange={(e) => setRates({ ...rates, sell_enabled: e.target.checked })}
            className="accent-sky-500"
          />
          <span className="text-white">تفعيل البيع</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyUsers}
            onChange={(e) => setNotifyUsers(e.target.checked)}
            className="accent-[#10F5A6]"
          />
          <span>إرسال إشعار فوري للمستخدمين بتحديث السعر</span>
        </label>

        <button
          type="button"
          onClick={() => saveRates(false)}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>حفظ إعدادات التسعير</span>
        </button>
      </div>
    </div>
  );
}

export function AdminPaymentsWalletsTab({
  accounts,
  wallets,
  onReload,
}: {
  accounts: PaymentAccount[];
  wallets: PlatformWallet[];
  onReload: () => void;
}) {
  const [newAccount, setNewAccount] = useState({
    method: 'lypay' as PaymentAccount['method'],
    bank_name: '',
    account_holder: '',
    account_number: '',
    iban: '',
    phone_or_id: '',
    instructions: '',
    is_active: true,
  });

  const [newWallet, setNewWallet] = useState({
    label: '',
    address: '',
    is_active: true,
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/payment-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
      if (res.ok) {
        setNewAccount({
          method: 'lypay',
          bank_name: '',
          account_holder: '',
          account_number: '',
          iban: '',
          phone_or_id: '',
          instructions: '',
          is_active: true,
        });
        setMsg('تمت إضافة وسيلة الدفع بنجاح');
        onReload();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleAccount = async (acc: PaymentAccount) => {
    await fetch('/api/admin/payment-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...acc, is_active: !acc.is_active }),
    });
    onReload();
  };

  const deleteAccount = async (id: string) => {
    await fetch(`/api/admin/payment-accounts?id=${id}`, { method: 'DELETE' });
    onReload();
  };

  const addWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWallet),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error || 'تعذر إضافة المحفظة');
        return;
      }
      setNewWallet({ label: '', address: '', is_active: true });
      setMsg('تمت إضافة محفظة TRON وتوليد رمز QR بنجاح');
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const activateWallet = async (w: PlatformWallet) => {
    await fetch('/api/admin/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...w, is_active: true }),
    });
    onReload();
  };

  const deleteWallet = async (id: string) => {
    await fetch(`/api/admin/wallets?id=${id}`, { method: 'DELETE' });
    onReload();
  };

  return (
    <div className="space-y-5">
      {msg && <p className="text-xs text-[#10F5A6] font-bold">{msg}</p>}

      {/* Payment Accounts Section */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-extrabold text-white">وسائل الدفع والحسابات المصرفية (LYPay / OnePay)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{acc.bank_name}</span>
                <span className="text-[11px] font-mono text-[#10F5A6]">{acc.method.toUpperCase()}</span>
              </div>
              <p className="text-slate-300">المستفيد: {acc.account_holder}</p>
              <p className="text-slate-300 font-mono">الحساب: {acc.account_number}</p>
              {acc.phone_or_id && <p className="text-slate-400 font-mono">ID/الهاتف: {acc.phone_or_id}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => toggleAccount(acc)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    acc.is_active ? 'bg-emerald-500/20 text-[#10F5A6]' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {acc.is_active ? 'نشط' : 'معطل'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteAccount(acc.id)}
                  className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs">
          <select
            value={newAccount.method}
            onChange={(e) => setNewAccount({ ...newAccount, method: e.target.value as PaymentAccount['method'] })}
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          >
            <option value="lypay">LYPay</option>
            <option value="onepay">OnePay</option>
            <option value="bank_transfer">تحويل مصرفي</option>
          </select>
          <input
            type="text"
            required
            value={newAccount.bank_name}
            onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
            placeholder="اسم المصرف / الخدمة"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="text"
            required
            value={newAccount.account_holder}
            onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })}
            placeholder="اسم المستفيد"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="text"
            required
            dir="ltr"
            value={newAccount.account_number}
            onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
            placeholder="رقم الحساب"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white font-mono"
          />
          <input
            type="text"
            dir="ltr"
            value={newAccount.phone_or_id}
            onChange={(e) => setNewAccount({ ...newAccount, phone_or_id: e.target.value })}
            placeholder="معرف LYPay/OnePay"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white font-mono"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold px-4 py-2 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب</span>
          </button>
        </form>
      </div>

      {/* Platform TRON Wallets Section */}
      <div className="tl-glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-extrabold text-white">محافظ المنصة (TRON TRC20 + QR Code)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wallets.map((w) => (
            <div key={w.id} className="rounded-2xl bg-[#071124] border border-white/10 p-3.5 text-xs flex items-center gap-3">
              {w.qr_code_url && (
                <img src={w.qr_code_url} alt={w.label} className="w-16 h-16 rounded-xl bg-white p-1 shrink-0" referrerPolicy="no-referrer" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="font-bold text-white flex items-center justify-between gap-2">
                  <span className="truncate">{w.label}</span>
                  <span className="text-[#10F5A6]">TRC20</span>
                </div>
                <p dir="ltr" className="font-mono text-[11px] text-slate-300 break-all">
                  {w.address}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => activateWallet(w)}
                    className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 ${
                      w.is_active ? 'bg-emerald-500/20 text-[#10F5A6]' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {w.is_active && <Check className="w-3 h-3" />}
                    <span>{w.is_active ? 'المحفظة النشطة' : 'تعيين كنشطة'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWallet(w.id)}
                    className="text-rose-400 hover:underline"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addWallet} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs">
          <input
            type="text"
            required
            value={newWallet.label}
            onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
            placeholder="اسم المحفظة (مثال: محفظة الاستقبال 2)"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white"
          />
          <input
            type="text"
            required
            dir="ltr"
            value={newWallet.address}
            onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
            placeholder="T... (TRON TRC20 Address)"
            className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-white font-mono"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-sky-500 text-white font-extrabold px-4 py-2 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة محفظة TRON</span>
          </button>
        </form>
      </div>
    </div>
  );
}
