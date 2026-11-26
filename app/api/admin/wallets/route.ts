import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, isValidTronAddress, sanitizeUrl, verifyOrigin } from '@/lib/security';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const wallets = await db.listPlatformWallets(false);
  return NextResponse.json({ wallets });
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
    label: string;
    address: string;
    qr_code_url?: string | null;
    is_active?: boolean;
  };

  if (!body.label?.trim() || !isValidTronAddress(body.address || '')) {
    return NextResponse.json(
      { error: 'يرجى إدخال اسم المحفظة وعنوان TRON (TRC20) صحيح يبدأ بحرف T' },
      { status: 400 }
    );
  }

  const saved = await db.savePlatformWallet({
    id: body.id,
    label: body.label.trim(),
    address: body.address.trim(),
    qr_code_url: body.qr_code_url ? sanitizeUrl(body.qr_code_url) || null : null,
    is_active: body.is_active ?? false,
  });

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: body.id ? 'WALLET_UPDATED' : 'WALLET_CREATED',
    target_type: 'platform_wallet',
    target_id: saved.id,
    details_json: { label: saved.label, address: saved.address, is_active: saved.is_active },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, wallet: saved });
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
    return NextResponse.json({ error: 'معرف المحفظة مطلوب' }, { status: 400 });
  }

  await db.deletePlatformWallet(id);
  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'WALLET_DELETED',
    target_type: 'platform_wallet',
    target_id: id,
    details_json: {},
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
