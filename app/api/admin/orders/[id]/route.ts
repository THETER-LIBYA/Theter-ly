import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/push';
import { getClientIp, sanitizeUrl, verifyOrigin } from '@/lib/security';
import { OrderStatus } from '@/lib/types';

const STATUS_TEMPLATE_MAP: Partial<Record<OrderStatus, string>> = {
  under_review: 'order_under_review',
  needs_edit: 'order_needs_edit',
  approved: 'order_approved',
  completed: 'order_completed',
  rejected: 'order_rejected',
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح بالوصول الإداري' }, { status: 403 });
  }

  const { id } = await context.params;
  const order = await db.getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  }

  const body = (await req.json()) as {
    status?: OrderStatus;
    adminNotes?: string;
    outboundTransferRef?: string;
    outboundProofUrl?: string;
  };

  const nextStatus = body.status || order.status;
  const allowedStatuses: OrderStatus[] = [
    'pending_review',
    'under_review',
    'needs_edit',
    'approved',
    'completed',
    'rejected',
    'cancelled',
  ];
  if (!allowedStatuses.includes(nextStatus)) {
    return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
  }

  if (order.status === 'completed' && nextStatus !== 'completed') {
    return NextResponse.json(
      { error: 'لا يمكن تغيير حالة طلب مكتمل ومسجل في السجل المالي' },
      { status: 400 }
    );
  }

  const note = body.adminNotes !== undefined ? body.adminNotes.trim() : (order.admin_notes || '');
  const outboundRef =
    body.outboundTransferRef !== undefined
      ? body.outboundTransferRef.trim() || null
      : order.outbound_transfer_ref;
  const outboundProof =
    body.outboundProofUrl !== undefined
      ? sanitizeUrl(body.outboundProofUrl) || null
      : order.outbound_proof_url;

  const updated = await db.updateOrder(
    order.id,
    {
      status: nextStatus,
      admin_notes: note || null,
      outbound_transfer_ref: outboundRef,
      outbound_proof_url: outboundProof,
      reviewed_by: admin.actorId,
    },
    {
      fromStatus: order.status,
      toStatus: nextStatus,
      changedBy: admin.actorId,
      note: note || `تحديث الحالة إلى ${nextStatus}`,
    }
  );

  // When transitioning to completed for the first time, append immutable ledger entries & update user volume
  if (nextStatus === 'completed' && order.status !== 'completed') {
    const rates = await db.getExchangeRates();
    const estMarginLyd =
      order.type === 'buy'
        ? Math.round(Number(order.usdt_amount) * Math.max(0, Number(rates.buy_margin)) * 1000) / 1000
        : Math.round(Number(order.usdt_amount) * Math.max(0, Math.abs(Number(rates.sell_margin))) * 1000) / 1000;

    await db.appendLedgerEntries([
      {
        order_id: order.id,
        user_id: order.user_id,
        entry_type: order.type === 'buy' ? 'buy_inflow' : 'sell_inflow',
        currency: order.type === 'buy' ? 'LYD' : 'USDT',
        amount: order.type === 'buy' ? Number(order.lyd_amount) : Number(order.usdt_amount),
        direction: 'credit',
        description: `استلام ${order.type === 'buy' ? 'دينار ليبي' : 'USDT'} لطلب #${order.order_number}`,
        created_by: admin.actorId,
      },
      {
        order_id: order.id,
        user_id: order.user_id,
        entry_type: order.type === 'buy' ? 'buy_outflow' : 'sell_outflow',
        currency: order.type === 'buy' ? 'USDT' : 'LYD',
        amount: order.type === 'buy' ? Number(order.usdt_amount) : Number(order.lyd_amount),
        direction: 'debit',
        description: `تحويل صادر لطلب #${order.order_number} (مرجع: ${outboundRef || 'غير محدد'})`,
        created_by: admin.actorId,
      },
      {
        order_id: order.id,
        user_id: order.user_id,
        entry_type: 'platform_margin',
        currency: 'LYD',
        amount: estMarginLyd,
        direction: 'credit',
        description: `هامش المنصة للطلب #${order.order_number}`,
        created_by: admin.actorId,
      },
    ]);

    const user = await db.getUserById(order.user_id);
    if (user) {
      await db.updateUser(user.id, {
        total_volume_usdt: Number(user.total_volume_usdt || 0) + Number(order.usdt_amount),
      });
    }
  }

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'ORDER_STATUS_UPDATED',
    target_type: 'order',
    target_id: order.id,
    details_json: {
      order_number: order.order_number,
      from: order.status,
      to: nextStatus,
      outboundRef,
      note,
    },
    ip_address: getClientIp(req),
  });

  // Notify customer via In-App + Web Push
  const templateKey = STATUS_TEMPLATE_MAP[nextStatus];
  await dispatchNotification({
    userId: order.user_id,
    templateKey,
    type: 'order_updates',
    fallbackTitle: `تحديث حالة الطلب #${order.order_number}`,
    fallbackBody: note || `تم تحديث حالة طلبك إلى ${nextStatus}.`,
    vars: {
      order_number: order.order_number,
      order_type: order.type === 'buy' ? 'شراء USDT' : 'بيع USDT',
      usdt_amount: order.usdt_amount,
      lyd_amount: order.lyd_amount,
      note: note || 'يرجى مراجعة تفاصيل الطلب',
    },
    orderId: order.id,
    actionUrl: `/orders/${order.id}`,
  });

  const history = await db.getOrderHistory(order.id);
  return NextResponse.json({ ok: true, order: updated, history });
}
