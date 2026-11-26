import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const accounts = await db.listPaymentAccounts(false);
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    method: 'lypay' | 'onepay' | 'bank_transfer';
    bank_name: string;
    account_holder: string;
    account_number: string;
    iban?: string;
    phone_or_id?: string;
    instructions?: string;
    is_active?: boolean;
    display_order?: number;
  };

  if (!body.method || !body.bank_name?.trim() || !body.account_holder?.trim() || !body.account_number?.trim()) {
    return NextResponse.json({ error: 'يرجى تعبئة بيانات الحساب المصرفي كاملة' }, { status: 400 });
  }

  const saved = await db.savePaymentAccount(body);
  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: body.id ? 'PAYMENT_ACCOUNT_UPDATED' : 'PAYMENT_ACCOUNT_CREATED',
    target_type: 'payment_account',
    target_id: saved.id,
    details_json: { method: saved.method, bank_name: saved.bank_name, is_active: saved.is_active },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, account: saved });
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'معرف الحساب مطلوب' }, { status: 400 });
  }

  await db.deletePaymentAccount(id);
  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'PAYMENT_ACCOUNT_DELETED',
    target_type: 'payment_account',
    target_id: id,
    details_json: {},
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
