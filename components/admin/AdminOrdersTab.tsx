'use client';

import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Upload } from 'lucide-react';
import type { Order, OrderStatus, PaymentAccount, PlatformWallet, User } from '@/lib/types';

export interface EnrichedOrder extends Order {
  user: User | null;
  bank_account: PaymentAccount | null;
  platform_wallet: PlatformWallet | null;
}

const STATUS_OPTS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending_review', label: 'قيد المراجعة' },
  { value: 'under_review', label: 'تحت المراجعة' },
  { value: 'needs_edit', label: 'يتطلب تعديل' },
  { value: 'approved', label: 'معتمد' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'rejected', label: 'مرفوض' },
];

export function AdminOrdersTab({
  orders,
  initialOrderId,
  onReload,
}: {
  orders: EnrichedOrder[];
  initialOrderId?: string;
  onReload: () => void;
}) {
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || orders[0]?.id || '');
  const [feedback, setFeedback] = useState('');

  const filtered = orders.filter((o) => {
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    return true;
  });

  const effectiveId = selectedOrderId || initialOrderId || '';
  const selectedOrder =
    orders.find((o) => o.id === effectiveId) || filtered[0] || null;

  const selectOrder = (o: EnrichedOrder) => {
    setSelectedOrderId(o.id);
    setFeedback('');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#071124] p-1 rounded-xl border border-white/10">
          {(['all', 'buy', 'sell'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === t ? 'bg-[#10F5A6] text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t === 'all' ? 'الكل' : t === 'buy' ? 'طلبات الشراء' : 'طلبات البيع'}
            </button>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | OrderStatus)}
          className="rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-xs text-white"
        >
          <option value="all">جميع الحالات</option>
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Orders Table / List */}
        <div className="lg:col-span-6 space-y-2 max-h-[600px] overflow-y-auto pl-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-[#071124] border border-white/10 p-6 text-center text-xs text-slate-400">
              لا توجد طلبات مطابقة للتصفية الحالية.
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOrder(o)}
                className={`w-full text-right rounded-2xl p-3.5 border transition flex items-center justify-between gap-3 ${
                  selectedOrder?.id === o.id
                    ? 'bg-emerald-500/10 border-[#10F5A6]'
                    : 'bg-[#071124] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className={o.type === 'buy' ? 'text-[#10F5A6]' : 'text-sky-400'}>
                      {o.type === 'buy' ? 'شراء' : 'بيع'}
                    </span>
                    <span className="font-mono text-slate-300">#{o.order_number}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {o.user?.full_name || 'عميل'} · <span dir="ltr">{o.user?.phone}</span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xs font-extrabold text-white tabular-nums">
                    {Number(o.usdt_amount).toFixed(2)} USDT
                  </div>
                  <div className="text-[10px] text-slate-400 tabular-nums">
                    {Number(o.lyd_amount).toFixed(3)} د.ل
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected Order Review Form */}
        <div className="lg:col-span-6">
          {selectedOrder ? (
            <OrderReviewForm
              key={`${selectedOrder.id}:${selectedOrder.updated_at}`}
              selectedOrder={selectedOrder}
              feedback={feedback}
              setFeedback={setFeedback}
              onReload={onReload}
            />
          ) : (
            <div className="tl-glass-card rounded-2xl p-6 text-center text-xs text-slate-400">
              اختر طلباً من القائمة لمراجعته.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderReviewForm({
  selectedOrder,
  feedback,
  setFeedback,
  onReload,
}: {
  selectedOrder: EnrichedOrder;
  feedback: string;
  setFeedback: (msg: string) => void;
  onReload: () => void;
}) {
  const [nextStatus, setNextStatus] = useState<OrderStatus>(selectedOrder.status);
  const [adminNotes, setAdminNotes] = useState(selectedOrder.admin_notes || '');
  const [outboundRef, setOutboundRef] = useState(selectedOrder.outbound_transfer_ref || '');
  const [outboundProofUrl, setOutboundProofUrl] = useState(selectedOrder.outbound_proof_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'proofs');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) setOutboundProofUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          adminNotes,
          outboundTransferRef: outboundRef,
          outboundProofUrl,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; order?: Order; error?: string };
      if (!res.ok) {
        setFeedback(data.error || 'تعذر تحديث الطلب');
        return;
      }
      setFeedback('تم تحديث حالة الطلب وتسجيله وإرسال إشعار للعميل بنجاح.');
      onReload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveStatus} className="tl-glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-white">
            مراجعة الطلب #{selectedOrder.order_number}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {selectedOrder.user?.full_name} ({selectedOrder.user?.phone})
          </p>
        </div>
        <span className="text-xs font-bold text-[#10F5A6] tabular-nums">
          {Number(selectedOrder.usdt_amount).toFixed(2)} USDT = {Number(selectedOrder.lyd_amount).toFixed(3)} د.ل
        </span>
      </div>

      <div className="rounded-xl bg-[#071124] border border-white/10 p-3.5 space-y-1.5 text-xs">
        <div>
          حالة توثيق العميل:{' '}
          <strong
            className={
              selectedOrder.user?.kyc_status === 'verified'
                ? 'text-[#10F5A6]'
                : selectedOrder.user?.kyc_status === 'needs_reverification'
                  ? 'text-rose-300'
                  : 'text-amber-300'
            }
          >
            {selectedOrder.user?.kyc_status === 'verified'
              ? 'موثق'
              : selectedOrder.user?.kyc_status === 'needs_reverification'
                ? 'مطلوب إعادة توثيق'
                : 'قيد المراجعة'}
          </strong>
        </div>
        {selectedOrder.type === 'buy' ? (
          <>
            <div>وسيلة الدفع: <strong className="text-white uppercase">{selectedOrder.payment_method}</strong></div>
            {selectedOrder.bank_account && (
              <div>الحساب المستقبِل بالمنصة: <strong className="text-sky-300">{selectedOrder.bank_account.bank_name} ({selectedOrder.bank_account.account_number})</strong></div>
            )}
            <div>اسم المحوّل: <strong className="text-white">{selectedOrder.sender_name}</strong></div>
            <div>المصرف: <strong className="text-white">{selectedOrder.sender_bank}</strong></div>
            <div>رقم التحويل: <strong className="text-white font-mono">{selectedOrder.transfer_reference}</strong></div>
            <div>محفظة الاستلام: <strong className="text-[#10F5A6] font-mono break-all">{selectedOrder.customer_wallet_address}</strong></div>
            {selectedOrder.receipt_url && (
              <a
                href={selectedOrder.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-400 hover:underline pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح إيصال الدفع</span>
              </a>
            )}
          </>
        ) : (
          <>
            <div>الشبكة: <strong className="text-[#10F5A6]">TRON ({selectedOrder.network})</strong></div>
            {selectedOrder.platform_wallet && (
              <div>محفظة المنصة المستلمة: <strong className="text-sky-300">{selectedOrder.platform_wallet.label}</strong></div>
            )}
            <div>TX Hash: <strong className="text-white font-mono break-all">{selectedOrder.tx_hash}</strong></div>
            <div>الاسم الثلاثي: <strong className="text-white">{selectedOrder.recipient_full_name}</strong></div>
            <div>المصرف: <strong className="text-white">{selectedOrder.recipient_bank}</strong></div>
            <div>رقم الحساب: <strong className="text-white font-mono">{selectedOrder.recipient_account_number}</strong></div>
            {selectedOrder.recipient_iban && (
              <div>IBAN: <strong className="text-white font-mono">{selectedOrder.recipient_iban}</strong></div>
            )}
          </>
        )}
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 p-3 text-xs text-[#10F5A6] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-300 mb-1">تغيير حالة الطلب</label>
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2.5 text-xs text-white"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-300 mb-1">مرجع التحويل الصادر (TX Hash أو رقم إشعار مصرفي)</label>
        <input
          type="text"
          dir="ltr"
          value={outboundRef}
          onChange={(e) => setOutboundRef(e.target.value)}
          placeholder="Outbound TX Hash or Bank Ref"
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-xs font-mono text-white"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-300 mb-1">إثبات التحويل الصادر</label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#071124] border border-white/15 text-xs text-sky-300 cursor-pointer hover:border-sky-400">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'جاري الرفع...' : 'رفع إثبات التحويل'}</span>
            <input type="file" accept="image/*,application/pdf" onChange={handleUploadProof} className="hidden" />
          </label>
          {outboundProofUrl && (
            <a href={outboundProofUrl} target="_blank" rel="noreferrer" className="text-xs text-[#10F5A6] hover:underline">
              تم إرفاق الإثبات
            </a>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-300 mb-1">ملاحظات إدارية (تظهر للعميل عند الرفض أو التعديل)</label>
        <textarea
          rows={2}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="w-full rounded-xl bg-[#071124] border border-white/15 px-3 py-2 text-xs text-white"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>اعتماد التحديث وإشعار العميل</span>
      </button>
    </form>
  );
}
