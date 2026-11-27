import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req, 'overview');
  if (admin.authorized) {
    const stats = await db.getPlatformStats();
    return NextResponse.json({ scope: 'platform', stats });
  }

  const user = await getSessionUser(req);
  if (!user || !user.terms_accepted_at || !user.onboarding_completed) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const stats = await db.getUserStats(user.id);
  return NextResponse.json({ scope: 'personal', stats });
}
