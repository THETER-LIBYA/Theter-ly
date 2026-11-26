import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyOrigin } from '@/lib/security';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 });
  }

  const [notifications, preferences] = await Promise.all([
    db.listUserNotifications(user.id, 60),
    db.getUserNotificationPreferences(user.id),
  ]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return NextResponse.json({ notifications, unreadCount, preferences });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول' }, { status: 401 });
  }

  const body = (await req.json()) as {
    action?: 'mark_read' | 'mark_all_read' | 'update_preferences';
    notificationId?: string;
    preferences?: {
      order_updates?: boolean;
      rate_alerts?: boolean;
      promotions?: boolean;
      admin_alerts?: boolean;
      web_push_enabled?: boolean;
    };
  };

  if (body.action === 'mark_all_read') {
    await db.markNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'mark_read' && body.notificationId) {
    await db.markNotificationsRead(user.id, body.notificationId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'update_preferences' && body.preferences) {
    const updated = await db.upsertUserNotificationPreferences(user.id, body.preferences);
    return NextResponse.json({ ok: true, preferences: updated });
  }

  return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
}
