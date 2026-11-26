'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, FileCheck2, Loader2, Upload } from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import type { Order, OrderStatusHistory } from '@/lib/types';

const STATUS_AR: Record<string, string> = {
  pending_review: 'قيد المراجعة',
  under_review: 'تحت المراجعة',
  needs_edit: 'يتطلب تعديل بيانات',
  approved: 'معتمد وجارٍ التنفيذ',
  completed: 'مكتمل',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
};

export function OrderDetailClient({
  initialOrder,
  initialHistory,
}: {
  initialOrder: Order;
  initialHistory: OrderStatusHistory[];
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [history, setHistory] = useState<OrderStatusHistory[]>(initialHistory);

  // Editable fields when status === 'needs_edit'
  const [senderName, setSenderName] = useState(order.sender_name || '');
  const [senderBank, setSenderBank] = useState(order.sender_bank || '');
  const [transferReference, setTransferReference] = useState(order.transfer_reference || '');
  const [customerWalletAddress, setCustomerWalletAddress] = useState(order.customer_wallet_address || '');
  const [receiptUrl, setReceiptUrl] = useState(order.receipt_url || '');
  const [txHash, setTxHash] = useState(order.tx_hash || '');
  const [recipientFullName, setRecipientFullName] = useState(order.recipient_full_name || '');
  const [recipientBank, setRecipientBank] = useState(order.recipient_bank || '');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState(order.recipient_account_number || '');
  const [recipientIban, setRecipientIban] = useState(order.recipient_iban || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'receipts');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) setReceiptUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          order.type === 'buy'
            ? { senderName, senderBank, transferReference, customerWalletAddress, receiptUrl }
            : { txHash, recipientFullName, recipientBank, recipientAccountNumber, recipientIban }
        ),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        setErr(data.error || 'تعذر حفظ التعديلات');
        return;
      }
      setOrder(data.order);
      setMsg('تم إرسال التعديلات وإعادة الطلب للمراجعة بنجاح');
      const refresh = await fetch(`/api/orders/${order.id}`);
      if (refresh.ok) {
        const refreshed = (await refresh.json()) as { history?: OrderStatusHistory[] };
        if (refreshed.history) setHistory(refreshed.history);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline">
          <ArrowRight className="w-4 h-4" />
          <span>العودة لسجل العمليات</span>
        </Link>
        <span data-copyable="true" className="font-mono text-xs text-slate-400">#{order.order_number}</span>
      </div>

      {/* Summary Card */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-white">
              {order.type === 'buy' ? 'طلب شراء USDT' : 'طلب بيع USDT'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              تاريخ الإنشاء: {formatTripoliDateTime(order.created_at)}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-[#10F5A6]/35 text-xs font-bold text-[#10F5A6]">
            {STATUS_AR[order.status] || order.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-center">
          <div className="rounded-2xl bg-[#071124] p-3">
            <div className="text-[11px] text-slate-400">المبلغ USDT</div>
            <div className="text-base font-extrabold text-[#10F5A6] tabular-nums mt-0.5">
              {Number(order.usdt_amount).toFixed(2)}
            </div>
          </div>
          <div className="rounded-2xl bg-[#071124] p-3">
            <div className="text-[11px] text-slate-400">سعر الصرف</div>
            <div className="text-base font-extrabold text-white tabular-nums mt-0.5">
              {Number(order.rate_applied).toFixed(3)}
            </div>
          </div>
          <div className="rounded-2xl bg-[#071124] p-3">
            <div className="text-[11px] text-slate-400">القيمة بالدينار</div>
            <div className="text-base font-extrabold text-white tabular-nums mt-0.5">
              {Number(order.lyd_amount).toFixed(3)}
            </div>
          </div>
        </div>

        {order.admin_notes && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3.5 text-xs text-amber-200">
            <strong className="block mb-1">ملاحظات الإدارة:</strong>
            {order.admin_notes}
          </div>
        )}

        {/* Order Specific Data */}
        <div className="rounded-2xl bg-[#071124] border border-white/10 p-4 space-y-2 text-xs">
          {order.type === 'buy' ? (
            <>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">وسيلة الدفع:</span>
                <span className="text-white font-bold uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">اسم المحوّل:</span>
                <span className="text-white">{order.sender_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">المصرف:</span>
                <span className="text-white">{order.sender_bank}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">رقم التحويل:</span>
                <span data-copyable="true" className="text-white font-mono">{order.transfer_reference}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">محفظة الاستلام ({order.network}):</span>
                <span data-copyable="true" className="text-[#10F5A6] font-mono break-all text-left">{order.customer_wallet_address}</span>
              </div>
              {order.receipt_url && (
                <div className="pt-2 border-t border-white/10">
                  <a
                    href={order.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-400 hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>عرض إيصال الدفع المرفق</span>
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">الشبكة:</span>
                <span className="text-[#10F5A6] font-bold">TRON ({order.network})</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">TX Hash:</span>
                <span data-copyable="true" className="text-white font-mono break-all text-left">{order.tx_hash}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">الاسم الثلاثي:</span>
                <span className="text-white">{order.recipient_full_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">المصرف:</span>
                <span className="text-white">{order.recipient_bank}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">رقم الحساب:</span>
                <span data-copyable="true" className="text-white font-mono">{order.recipient_account_number}</span>
              </div>
              {order.recipient_iban && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">IBAN:</span>
                  <span data-copyable="true" className="text-white font-mono">{order.recipient_iban}</span>
                </div>
              )}
            </>
          )}

          {(order.outbound_transfer_ref || order.outbound_proof_url) && (
            <div className="pt-3 mt-2 border-t border-emerald-500/25 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#10F5A6] font-bold">
                <FileCheck2 className="w-4 h-4" />
                <span>بيانات التحويل الصادر من المنصة</span>
              </div>
              {order.outbound_transfer_ref && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">مرجع التنفيذ:</span>
                  <span data-copyable="true" className="text-white font-mono break-all">{order.outbound_transfer_ref}</span>
                </div>
              )}
              {order.outbound_proof_url && (
                <a
                  href={order.outbound_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#10F5A6] hover:underline font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>عرض إثبات التحويل الصادر</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resubmit Form when status === 'needs_edit' */}
      {order.status === 'needs_edit' && (
        <form onSubmit={handleResubmit} className="tl-glass-card rounded-3xl p-5 space-y-4 border-orange-400/40">
          <h2 className="text-sm font-extrabold text-orange-300">تحديث بيانات الطلب المطلوبة</h2>
          {err && <p className="text-xs text-rose-300">{err}</p>}
          {msg && <p className="text-xs text-[#10F5A6]">{msg}</p>}

          {order.type === 'buy' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="اسم المحوّل"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white"
              />
              <input
                type="text"
                value={senderBank}
                onChange={(e) => setSenderBank(e.target.value)}
                placeholder="المصرف"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white"
              />
              <input
                type="text"
                dir="ltr"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                placeholder="رقم التحويل"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white font-mono"
              />
              <input
                type="text"
                dir="ltr"
                value={customerWalletAddress}
                onChange={(e) => setCustomerWalletAddress(e.target.value)}
                placeholder="عنوان محفظة TRON"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white font-mono"
              />
              <label className="flex items-center gap-2 text-xs text-sky-300 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'جاري الرفع...' : 'تحديث صورة الإيصال (اختياري)'}</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                dir="ltr"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Transaction Hash"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-xs text-white font-mono"
              />
              <input
                type="text"
                value={recipientFullName}
                onChange={(e) => setRecipientFullName(e.target.value)}
                placeholder="الاسم الثلاثي"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white"
              />
              <input
                type="text"
                value={recipientBank}
                onChange={(e) => setRecipientBank(e.target.value)}
                placeholder="المصرف"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white"
              />
              <input
                type="text"
                dir="ltr"
                value={recipientAccountNumber}
                onChange={(e) => setRecipientAccountNumber(e.target.value)}
                placeholder="رقم الحساب"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white font-mono"
              />
              <input
                type="text"
                dir="ltr"
                value={recipientIban}
                onChange={(e) => setRecipientIban(e.target.value)}
                placeholder="IBAN (اختياري)"
                className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-sm text-white font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-orange-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>حفظ التعديلات وإعادة الإرسال للمراجعة</span>
          </button>
        </form>
      )}

      {/* Status Timeline */}
      <div className="tl-glass-card rounded-3xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>سجل حالات الطلب</span>
        </h2>
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="flex items-start gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#10F5A6] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white">{STATUS_AR[item.to_status] || item.to_status}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {formatTripoliDateTime(item.created_at)}
                  </span>
                </div>
                {item.note && <p className="text-slate-300 mt-0.5">{item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
