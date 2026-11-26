import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyAllAdmins } from '@/lib/push';
import { isValidTronAddress, isValidTxHash, sanitizeUrl, verifyOrigin } from '@/lib/security';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await getSessionUser(req);
  const admin = await isAdminAuthenticated(req);

  if (!user && !admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const order = await db.getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  }

  if (!admin.authorized && order.user_id !== user?.id) {
    return NextResponse.json({ error: 'غير مصرح لك بعرض هذا الطلب' }, { status: 403 });
  }

  const history = await db.getOrderHistory(order.id);
  return NextResponse.json({ order, history });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const { id } = await context.params;
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 });
  }

  const order = await db.getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  }
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'غير مصرح بتعديل هذا الطلب' }, { status: 403 });
  }
  if (order.status !== 'needs_edit') {
    return NextResponse.json(
      { error: 'يمكن تعديل البيانات فقط عندما تكون حالة الطلب "يتطلب تعديل"' },
      { status: 400 }
    );
  }

  const body = (await req.json()) as Record<string, string | undefined>;
  const patch: Partial<typeof order> = { status: 'pending_review' };

  if (order.type === 'buy') {
    if (body.senderName) patch.sender_name = body.senderName.trim();
    if (body.senderBank) patch.sender_bank = body.senderBank.trim();
    if (body.transferReference) patch.transfer_reference = body.transferReference.trim();
    if (body.receiptUrl) {
      const cleanUrl = sanitizeUrl(body.receiptUrl);
      if (cleanUrl) patch.receipt_url = cleanUrl;
    }
    if (body.customerWalletAddress) {
      if (!isValidTronAddress(body.customerWalletAddress)) {
        return NextResponse.json({ error: 'عنوان محفظة TRON غير صالح' }, { status: 400 });
      }
      patch.customer_wallet_address = body.customerWalletAddress.trim();
    }
  } else {
    if (body.txHash) {
      if (!isValidTxHash(body.txHash)) {
        return NextResponse.json({ error: 'معرف المعاملة غير صالح' }, { status: 400 });
      }
      const dup = await db.getOrderByTxHash(body.txHash.trim());
      if (dup && dup.id !== order.id) {
        return NextResponse.json({ error: 'معرف المعاملة مستخدم في طلب آخر' }, { status: 409 });
      }
      patch.tx_hash = body.txHash.trim();
    }
    if (body.recipientFullName) patch.recipient_full_name = body.recipientFullName.trim();
    if (body.recipientBank) patch.recipient_bank = body.recipientBank.trim();
    if (body.recipientAccountNumber) patch.recipient_account_number = body.recipientAccountNumber.trim();
    if (body.recipientIban !== undefined) patch.recipient_iban = body.recipientIban?.trim() || null;
  }

  const updated = await db.updateOrder(order.id, patch, {
    fromStatus: order.status,
    toStatus: 'pending_review',
    changedBy: user.id,
    note: 'قام العميل بتحديث بيانات الطلب وإعادته للمراجعة',
  });

  await notifyAllAdmins({
    fallbackTitle: `تحديث بيانات الطلب #${order.order_number}`,
    fallbackBody: `قام العميل بتعديل بيانات الطلب #${order.order_number} وإعادته للمراجعة.`,
    orderId: order.id,
    actionUrl: `/admin?tab=orders&orderId=${order.id}`,
  });

  return NextResponse.json({ ok: true, order: updated });
}
