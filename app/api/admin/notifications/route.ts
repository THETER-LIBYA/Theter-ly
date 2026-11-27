import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/push';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'notifications');
  if (!check.ok) return check.response;

  const [templates, logs, users] = await Promise.all([
    db.listNotificationTemplates(),
    db.listAllNotifications(100),
    db.listUsers(),
  ]);

  const recipients = users
    .filter((u) => !u.is_banned)
    .map((u) => ({ id: u.id, full_name: u.full_name, phone: u.phone }));

  return NextResponse.json({ templates, logs, recipients });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireAdminPermission(req, 'notifications');
  if (!check.ok) return check.response;
  const { admin } = check;

  const body = (await req.json()) as {
    action: 'send' | 'update_template';
    targetUserId?: string | 'all';
    type?: 'order_updates' | 'rate_alerts' | 'promotions';
    title?: string;
    body?: string;
    actionUrl?: string;
    templateKey?: string;
    templatePatch?: {
      title_template?: string;
      body_template?: string;
      is_enabled?: boolean;
      channel_push?: boolean;
      channel_in_app?: boolean;
    };
  };

  if (body.action === 'update_template' && body.templateKey && body.templatePatch) {
    const updated = await db.updateNotificationTemplate(body.templateKey, body.templatePatch);
    if (!updated) {
      return NextResponse.json({ error: 'القالب غير موجود' }, { status: 404 });
    }
    await db.appendAuditLog({
      actor_id: admin.actorId,
      actor_role: admin.actorRole,
      action: 'NOTIFICATION_TEMPLATE_UPDATED',
      target_type: 'notification_template',
      target_id: body.templateKey,
      details_json: body.templatePatch,
      ip_address: getClientIp(req),
    });
    return NextResponse.json({ ok: true, template: updated });
  }

  if (body.action === 'send') {
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: 'عنوان الإشعار ونصه مطلوبان' }, { status: 400 });
    }

    const notifType = body.type || 'promotions';
    let sentCount = 0;
    let pushCount = 0;
    let failedCount = 0;
    let subscribedDevices = 0;
    let lastError: string | null = null;

    if (body.targetUserId === 'all' || !body.targetUserId) {
      const users = await db.listUsers();
      const results = await Promise.all(
        users
          .filter((u) => !u.is_banned)
          .map((u) =>
            dispatchNotification({
              userId: u.id,
              type: notifType,
              fallbackTitle: body.title!.trim(),
              fallbackBody: body.body!.trim(),
              actionUrl: body.actionUrl?.trim() || '/notifications',
              forceDeliver: true,
            })
          )
      );
      sentCount = results.filter((r) => r.inAppSent).length;
      pushCount = results.reduce((sum, r) => sum + r.pushSentCount, 0);
      failedCount = results.reduce((sum, r) => sum + (r.pushFailedCount || 0), 0);
      subscribedDevices = results.reduce((sum, r) => sum + (r.activeSubscriptions || 0), 0);
      lastError = results.find((r) => r.lastError)?.lastError || null;
    } else {
      const r = await dispatchNotification({
        userId: body.targetUserId,
        type: notifType,
        fallbackTitle: body.title.trim(),
        fallbackBody: body.body.trim(),
        actionUrl: body.actionUrl?.trim() || '/notifications',
        forceDeliver: true,
      });
      sentCount = r.inAppSent ? 1 : 0;
      pushCount = r.pushSentCount;
      failedCount = r.pushFailedCount || 0;
      subscribedDevices = r.activeSubscriptions || 0;
      lastError = r.lastError || null;
    }

    await db.appendAuditLog({
      actor_id: admin.actorId,
      actor_role: admin.actorRole,
      action: 'ADMIN_NOTIFICATION_SENT',
      target_type: 'notification',
      target_id: body.targetUserId || 'all',
      details_json: { title: body.title, sentCount, pushCount, failedCount, subscribedDevices },
      ip_address: getClientIp(req),
    });

    return NextResponse.json({
      ok: true,
      sentCount,
      pushCount,
      failedCount,
      subscribedDevices,
      lastError,
    });
  }

  return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
}
