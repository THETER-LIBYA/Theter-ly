import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { db } from './db';
import {
  ADMIN_COOKIE_NAME,
  hashToken,
  SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
} from './security';
import { User } from './types';

export async function getSessionUser(req?: NextRequest): Promise<User | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (!token) {
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    }
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) return null;
  const session = await db.getUserSessionByTokenHash(hashToken(token));
  if (!session) return null;

  const expiresMs = new Date(session.expires_at).getTime();
  const now = Date.now();
  if (!Number.isFinite(expiresMs) || expiresMs < now) return null;

  const user = await db.getUserById(session.user_id);
  if (!user || user.is_banned) return null;

  // Sliding 4-day inactivity expiration: extend DB expiry if >12h has elapsed since last extension
  const remainingMs = expiresMs - now;
  const fullTtlMs = USER_SESSION_TTL_SECONDS * 1000;
  if (remainingMs < fullTtlMs - 1000 * 60 * 60 * 12) {
    const newExpires = new Date(now + fullTtlMs).toISOString();
    await db.extendUserSession(session.id, user.id, newExpires).catch(() => {});
  }

  return user;
}

export async function requireOnboardedUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.terms_accepted_at || !user.onboarding_completed) {
    redirect('/');
  }
  return user;
}

export async function isAdminAuthenticated(req?: NextRequest): Promise<{
  authorized: boolean;
  actorId: string | null;
  actorRole: string;
}> {
  let adminToken: string | undefined;
  if (req) {
    adminToken = req.headers.get('x-admin-token') || req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  }

  if (!adminToken) {
    return { authorized: false, actorId: null, actorRole: 'guest' };
  }

  const session = await db.getUserSessionByTokenHash(hashToken(adminToken));
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return { authorized: false, actorId: null, actorRole: 'guest' };
  }

  const adminUser = await db.getUserById(session.user_id);
  if (!adminUser || adminUser.is_banned || !['support', 'finance', 'admin', 'super_admin'].includes(adminUser.role)) {
    return { authorized: false, actorId: null, actorRole: 'guest' };
  }

  return { authorized: true, actorId: adminUser.id, actorRole: adminUser.role };
}
