import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, verifyOrigin } from '@/lib/security';
import type { SupportMessage } from '@/lib/types';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const messages = await db.listSupportMessages(100);
  return NextResponse.json({ ok: true, messages });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    status?: SupportMessage['status'];
    admin_reply_note?: string | null;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'معرف الرسالة مطلوب' }, { status: 400 });
  }

  const patch: { status?: SupportMessage['status']; admin_reply_note?: string | null } = {};
  if (body.status && ['open', 'in_progress', 'resolved'].includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.admin_reply_note === 'string') {
    patch.admin_reply_note = body.admin_reply_note.trim() || null;
  }

  const updated = await db.updateSupportMessage(body.id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 });
  }

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'SUPPORT_MESSAGE_UPDATED',
    target_type: 'support_message',
    target_id: updated.id,
    details_json: patch,
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, message: updated });
}
