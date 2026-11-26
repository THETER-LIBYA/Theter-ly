import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildCookieOptions,
  hashToken,
  SESSION_COOKIE_NAME,
  verifyOrigin,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const sessionToken =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await db.revokeUserSession(hashToken(sessionToken));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, '', buildCookieOptions(0));
  return res;
}
