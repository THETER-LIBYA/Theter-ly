import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/push';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { KycStatus, UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() || undefined;
  const [users, orders] = await Promise.all([db.listUsers(q), db.listOrders({ limit: 500 })]);

  const enriched = users.map((u) => {
    const userOrders = orders.filter((o) => o.user_id === u.id);
    return {
      ...u,
      ordersCount: userOrders.length,
      recentOrders: userOrders.slice(0, 5),
    };
  });

  return NextResponse.json({ users: enriched });
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
    userId: string;
    is_banned?: boolean;
    ban_reason?: string | null;
    kyc_status?: KycStatus;
    kyc_note?: string | null;
    role?: UserRole;
    full_name?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
  }

  const patch: Parameters<typeof db.updateUser>[1] = {};
  if (typeof body.is_banned === 'boolean') {
    patch.is_banned = body.is_banned;
    patch.ban_reason = body.is_banned ? (body.ban_reason?.trim() || 'حظر إداري') : null;
  }
  if (
    body.kyc_status &&
    ['unverified', 'pending', 'verified', 'needs_reverification'].includes(body.kyc_status)
  ) {
    patch.kyc_status = body.kyc_status;
    if (body.kyc_status === 'verified') {
      patch.kyc_note = null;
    } else if (body.kyc_status === 'needs_reverification') {
      patch.kyc_note =
        body.kyc_note?.trim() ||
        'يرجى إعادة رفع صورة واضحة لجواز السفر وشهادة الميلاد ومطابقة البيانات.';
    }
  } else if (body.kyc_note !== undefined) {
    patch.kyc_note = body.kyc_note?.trim() || null;
  }
  if (body.role && ['user', 'support', 'finance', 'admin', 'super_admin'].includes(body.role)) {
    patch.role = body.role;
  }
  if (body.full_name?.trim()) {
    patch.full_name = body.full_name.trim();
  }

  const updated = await db.updateUser(body.userId, patch);
  if (!updated) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  }

  if (body.is_banned === true) {
    await db.revokeAllUserSessions(updated.id);
  }

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'USER_UPDATED',
    target_type: 'user',
    target_id: updated.id,
    details_json: patch,
    ip_address: getClientIp(req),
  });

  if (body.kyc_status === 'verified') {
    await dispatchNotification({
      userId: updated.id,
      type: 'order_updates',
      fallbackTitle: 'تم توثيق حسابك بنجاح',
      fallbackBody: 'مبروك! تم اعتماد مستنداتك وتوثيق حسابك في تيتر ليبيا ويمكنك الآن التداول بكامل المزايا.',
      actionUrl: '/account',
    });
  } else if (body.kyc_status === 'needs_reverification') {
    await dispatchNotification({
      userId: updated.id,
      type: 'order_updates',
      fallbackTitle: 'مطلوب إعادة توثيق الحساب والمستندات',
      fallbackBody:
        updated.kyc_note ||
        'تبين وجود عدم وضوح أو خطأ في المستندات المرفقة. يرجى الدخول لحسابك وإعادة رفع صور جواز السفر وشهادة الميلاد.',
      actionUrl: '/account?reverify=1',
    });
  } else if (body.is_banned === true) {
    await dispatchNotification({
      userId: updated.id,
      type: 'order_updates',
      fallbackTitle: 'تنبيه حول حالة الحساب',
      fallbackBody: updated.ban_reason || 'تم تعليق حسابك مؤقتاً من قبل الإدارة. يرجى التواصل مع الدعم الفني.',
      actionUrl: '/contact',
    });
  }

  return NextResponse.json({ ok: true, user: updated });
}
