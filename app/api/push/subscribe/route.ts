import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) {
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
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: req.headers.get('user-agent') || null,
  });

  await db.upsertUserNotificationPreferences(user.id, { web_push_enabled: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) {
    await db.deactivatePushSubscription(body.endpoint);
  }
  await db.upsertUserNotificationPreferences(user.id, { web_push_enabled: false });
  return NextResponse.json({ ok: true });
}
