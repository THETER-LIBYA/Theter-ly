import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyOrigin } from '@/lib/security';

async function resolveActorId(req: NextRequest): Promise<string | null> {
  const user = await getSessionUser(req);
  if (user) return user.id;
  const admin = await isAdminAuthenticated(req);
  if (admin.authorized && admin.actorId) return admin.actorId;
  return null;
}

export async function GET(req: NextRequest) {
  const actorId = await resolveActorId(req);
  if (!actorId) {
    return NextResponse.json({ subscribedCount: 0, hasActiveSubscription: false });
  }
  const subs = await db.listUserPushSubscriptions(actorId);
  return NextResponse.json({
    subscribedCount: subs.length,
    hasActiveSubscription: subs.length > 0,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const actorId = await resolveActorId(req);
  if (!actorId) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول لتفعيل الإشعارات الفورية' }, { status: 401 });
  }

  const body = (await req.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'بيانات الاشتراك غير مكتملة' }, { status: 400 });
  }

  await db.savePushSubscription({
    user_id: actorId,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: req.headers.get('user-agent') || null,
  });

  await db.upsertUserNotificationPreferences(actorId, { web_push_enabled: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const actorId = await resolveActorId(req);
  if (!actorId) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) {
    await db.deactivatePushSubscription(body.endpoint);
  }
  await db.upsertUserNotificationPreferences(actorId, { web_push_enabled: false });
  return NextResponse.json({ ok: true });
}
