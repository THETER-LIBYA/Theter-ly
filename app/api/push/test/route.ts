import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { sendWebPushTest } from '@/lib/push';
import { verifyOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  const admin = user ? null : await isAdminAuthenticated(req);
  const actorId = user?.id || (admin?.authorized ? admin.actorId : null);

  if (!actorId) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول لإرسال إشعار تجريبي' }, { status: 401 });
  }

  const result = await sendWebPushTest(actorId);
  return NextResponse.json({
    ok: result.sentCount > 0,
    ...result,
  });
}
