'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react';
import { formatTripoliDateTime } from '@/lib/format';
import type { Order, OrderStatus, PaymentAccount, PlatformWallet, User } from '@/lib/types';
import { AdminDocumentViewerModal, type ViewerDocument } from './AdminDocumentViewerModal';

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  onepay: 'ون باي (OnePay)',
  lypay: 'لي باي (LYPay)',
  bank_transfer: 'تحويل مصرفي مباشر',
  tron_trc20: 'شبكة TRON (TRC20)',
};

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
  const selectedOrder = orders.find((o) => o.id === effectiveId) || filtered[0] || null;

  const selectOrder = (o: EnrichedOrder) => {
    setSelectedOrderId(o.id);
    setFeedback('');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#081226] p-1 rounded-xl border border-white/10">
          {(['all', 'buy', 'sell'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
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
          className="rounded-xl bg-[#081226] border border-white/15 px-3 py-2 text-xs text-white"
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
        {/* Orders List */}
        <div className="lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pl-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-[#081226] border border-white/10 p-6 text-center text-xs text-slate-400">
              لا توجد طلبات مطابقة للتصفية الحالية.
            </div>
          ) : (
            filtered.map((o) => {
              const statusLabel = STATUS_OPTS.find((s) => s.value === o.status)?.label || o.status;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o)}
                  className={`w-full text-right rounded-2xl p-3.5 border transition flex items-center justify-between gap-3 ${
                    selectedOrder?.id === o.id
                      ? 'bg-emerald-500/10 border-[#10F5A6]'
                      : 'bg-[#081226] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          o.type === 'buy'
                            ? 'bg-emerald-500/15 text-[#10F5A6]'
                            : 'bg-sky-500/15 text-sky-300'
                        }`}
                      >
                        {o.type === 'buy' ? 'شراء' : 'بيع'}
                      </span>
                      <span className="font-mono text-slate-200">#{o.order_number}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{statusLabel}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {o.user?.full_name || 'عميل'} · <span dir="ltr">+{o.user?.phone}</span>
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
              );
            })
          )}
        </div>

        {/* Selected Order Professional Inspection Card */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <OrderReviewForm
              key={`${selectedOrder.id}:${selectedOrder.updated_at}`}
              selectedOrder={selectedOrder}
              feedback={feedback}
              setFeedback={setFeedback}
              onReload={onReload}
            />
          ) : (
            <div className="rounded-2xl bg-[#081226] border border-white/10 p-6 text-center text-xs text-slate-400">
              اختر طلباً من القائمة لمراجعته.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyableValue({ label, value, mono = false, accent = 'text-white' }: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] text-sky-300 hover:text-white inline-flex items-center gap-1 transition"
        >
          {copied ? <Check className="w-3 h-3 text-[#10F5A6]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
        </button>
      </div>
      <div
        dir={mono ? 'ltr' : undefined}
        className={`text-xs font-bold break-all ${mono ? 'font-mono text-left' : ''} ${accent}`}
      >
        {value}
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

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const orderDocuments: ViewerDocument[] = [];
  if (selectedOrder.receipt_url) {
    orderDocuments.push({
      title: `إيصال الدفع — طلب #${selectedOrder.order_number}`,
      subtitle: `${selectedOrder.sender_name || selectedOrder.user?.full_name || ''} · ${selectedOrder.transfer_reference || ''}`,
      url: selectedOrder.receipt_url,
    });
  }
  if (outboundProofUrl) {
    orderDocuments.push({
      title: `إثبات التحويل الصادر — طلب #${selectedOrder.order_number}`,
      subtitle: outboundRef || 'مرجع التحويل المرفق',
      url: outboundProofUrl,
    });
  }

  const openDocumentModal = (targetUrl: string) => {
    const idx = orderDocuments.findIndex((d) => d.url === targetUrl);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

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

  const kycBadge =
    selectedOrder.user?.kyc_status === 'verified'
      ? { label: 'موثق بالكامل', cls: 'bg-emerald-500/15 border-[#10F5A6]/30 text-[#10F5A6]' }
      : selectedOrder.user?.kyc_status === 'needs_reverification'
        ? { label: 'مطلوب إعادة توثيق', cls: 'bg-rose-500/15 border-rose-400/30 text-rose-300' }
        : { label: 'قيد المراجعة', cls: 'bg-amber-500/15 border-amber-400/30 text-amber-300' };

  const isReceiptPdf = selectedOrder.receipt_url?.toLowerCase().split('?')[0].endsWith('.pdf');

  return (
    <>
      <form
        onSubmit={handleSaveStatus}
        className="rounded-2xl bg-[#081226] border border-white/10 p-5 space-y-4"
      >
        {/* Executive Order Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                  selectedOrder.type === 'buy'
                    ? 'bg-emerald-500/15 text-[#10F5A6]'
                    : 'bg-sky-500/15 text-sky-300'
                }`}
              >
                {selectedOrder.type === 'buy' ? 'طلب شراء USDT' : 'طلب بيع USDT'}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white font-mono">
                #{selectedOrder.order_number}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 ${kycBadge.cls}`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>توثيق العميل: {kycBadge.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {selectedOrder.user?.full_name || 'عميل'} ·{' '}
              <span dir="ltr" className="font-mono text-slate-300">
                +{selectedOrder.user?.phone}
              </span>{' '}
              · {formatTripoliDateTime(selectedOrder.created_at)}
            </p>
          </div>

          <div className="rounded-xl bg-[#040B1A] border border-white/10 px-3.5 py-2 text-left">
            <div className="text-sm font-extrabold text-[#10F5A6] tabular-nums">
              {Number(selectedOrder.usdt_amount).toFixed(2)} USDT
            </div>
            <div className="text-[11px] text-slate-300 tabular-nums font-bold">
              {Number(selectedOrder.lyd_amount).toFixed(3)} د.ل
              <span className="text-slate-500 font-normal mx-1">
                (سعر {Number(selectedOrder.rate_applied).toFixed(3)})
              </span>
            </div>
          </div>
        </div>

        {/* Structured Financial Inspection Grid */}
        {selectedOrder.type === 'buy' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
                <div className="text-[11px] text-slate-400">وسيلة الدفع</div>
                <div className="font-bold text-white">
                  {PAYMENT_METHOD_LABELS[selectedOrder.payment_method || ''] ||
                    selectedOrder.payment_method}
                </div>
              </div>

              {selectedOrder.bank_account && (
                <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
                  <div className="text-[11px] text-slate-400">الحساب المستقبِل بالمنصة</div>
                  <div className="font-bold text-sky-300">
                    {selectedOrder.bank_account.bank_name} ({selectedOrder.bank_account.account_number})
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
                <div className="text-[11px] text-slate-400">اسم المحوّل</div>
                <div className="font-bold text-white">{selectedOrder.sender_name || '—'}</div>
              </div>

              <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
                <div className="text-[11px] text-slate-400">المصرف المرسِل</div>
                <div className="font-bold text-white">{selectedOrder.sender_bank || '—'}</div>
              </div>

              {selectedOrder.transfer_reference && (
                <CopyableValue
                  label="رقم مرجع التحويل"
                  value={selectedOrder.transfer_reference}
                  mono
                />
              )}

              {selectedOrder.customer_wallet_address && (
                <CopyableValue
                  label="محفظة الاستلام (TRON TRC20)"
                  value={selectedOrder.customer_wallet_address}
                  mono
                  accent="text-[#10F5A6]"
                />
              )}
            </div>

            {/* Inline Receipt Smart Card (never leaves /admin) */}
            {selectedOrder.receipt_url && (
              <div className="rounded-2xl bg-[#040B1A] border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {!isReceiptPdf ? (
                    <button
                      type="button"
                      onClick={() => openDocumentModal(selectedOrder.receipt_url!)}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-white/15 bg-[#081226] shrink-0 group relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedOrder.receipt_url}
                        alt="معاينة إيصال الدفع"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white">إيصال الدفع المرفق</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      يُفتح للمراجعة والتكبير والتدوير مباشرة داخل لوحة التحكم دون مغادرة الصفحة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDocumentModal(selectedOrder.receipt_url!)}
                  className="px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition shrink-0"
                >
                  <Eye className="w-4 h-4" />
                  <span>معاينة الإيصال</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#10F5A6]" />
                <span>الشبكة</span>
              </div>
              <div className="font-bold text-[#10F5A6]">TRON ({selectedOrder.network})</div>
            </div>

            {selectedOrder.platform_wallet && (
              <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
                <div className="text-[11px] text-slate-400">محفظة المنصة المستلمة</div>
                <div className="font-bold text-sky-300">{selectedOrder.platform_wallet.label}</div>
              </div>
            )}

            {selectedOrder.tx_hash && (
              <div className="sm:col-span-2">
                <CopyableValue label="معرف المعاملة (TX Hash)" value={selectedOrder.tx_hash} mono />
              </div>
            )}

            <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
              <div className="text-[11px] text-slate-400">الاسم الثلاثي للمستلم</div>
              <div className="font-bold text-white">{selectedOrder.recipient_full_name || '—'}</div>
            </div>

            <div className="rounded-xl bg-[#040B1A] border border-white/10 p-3 space-y-0.5">
              <div className="text-[11px] text-slate-400">المصرف المستلم</div>
              <div className="font-bold text-white">{selectedOrder.recipient_bank || '—'}</div>
            </div>

            {selectedOrder.recipient_account_number && (
              <CopyableValue
                label="رقم الحساب المصرفي"
                value={selectedOrder.recipient_account_number}
                mono
              />
            )}

            {selectedOrder.recipient_iban && (
              <CopyableValue label="رقم الآيبان (IBAN)" value={selectedOrder.recipient_iban} mono />
            )}
          </div>
        )}

        {feedback && (
          <div className="rounded-xl bg-emerald-500/15 border border-[#10F5A6]/35 p-3 text-xs text-[#10F5A6] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">تغيير حالة الطلب</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-xs text-white"
            >
              {STATUS_OPTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              مرجع التحويل الصادر (TX Hash أو رقم إشعار مصرفي)
            </label>
            <input
              type="text"
              dir="ltr"
              value={outboundRef}
              onChange={(e) => setOutboundRef(e.target.value)}
              placeholder="Outbound TX Hash or Bank Ref"
              className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2.5 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-1">إثبات التحويل الصادر</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#040B1A] border border-white/15 text-xs text-sky-300 cursor-pointer hover:border-sky-400">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'جاري الرفع...' : 'رفع إثبات التحويل'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadProof}
                className="hidden"
              />
            </label>
            {outboundProofUrl && (
              <button
                type="button"
                onClick={() => openDocumentModal(outboundProofUrl)}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-[#10F5A6]/30 text-xs text-[#10F5A6] font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500/25 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة إثبات التحويل المرفق</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-1">
            ملاحظات إدارية (تظهر للعميل عند الرفض أو التعديل)
          </label>
          <textarea
            rows={2}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full rounded-xl bg-[#040B1A] border border-white/15 px-3 py-2 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#10F5A6] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>اعتماد التحديث وإشعار العميل</span>
        </button>
      </form>

      <AdminDocumentViewerModal
        documents={orderDocuments}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
