import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const [user, admin] = await Promise.all([getSessionUser(req), isAdminAuthenticated(req)]);
  if (!admin.authorized && (!user || !user.terms_accepted_at || !user.onboarding_completed)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }
  const stats = await db.getPublicStats();
  return NextResponse.json({ stats });
}
