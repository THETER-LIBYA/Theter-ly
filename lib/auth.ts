import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { db, SUPER_ADMIN_ACTOR_ID } from './db';
import {
  ADMIN_COOKIE_NAME,
  hashToken,
  SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
} from './security';
import { AdminPermission, ALL_ADMIN_PERMISSIONS, STAFF_ASSIGNABLE_PERMISSIONS, User } from './types';

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

export interface AdminAuthContext {
  authorized: boolean;
  authenticated: boolean;
  actorId: string | null;
  actorType: 'super_admin' | 'staff' | null;
  actorName: string;
  actorRole: string;
  permissions: AdminPermission[];
}

export async function isAdminAuthenticated(
  req?: NextRequest,
  requiredPermission?: AdminPermission
): Promise<AdminAuthContext> {
  const guest: AdminAuthContext = {
    authorized: false,
    authenticated: false,
    actorId: null,
    actorType: null,
    actorName: '',
    actorRole: 'guest',
    permissions: [],
  };

  let adminToken: string | undefined;
  if (req) {
    adminToken = req.headers.get('x-admin-token') || req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  }

  if (!adminToken) return guest;

  const session = await db.getAdminSessionByTokenHash(hashToken(adminToken));
  if (!session) return guest;

  const expiresMs = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
    return guest;
  }

  if (session.actor_type === 'super_admin') {
    const permissions = ALL_ADMIN_PERMISSIONS;
    const hasPerm = !requiredPermission || permissions.includes(requiredPermission);
    return {
      authorized: hasPerm,
      authenticated: true,
      actorId: SUPER_ADMIN_ACTOR_ID,
      actorType: 'super_admin',
      actorName: session.actor_name || 'المدير العام',
      actorRole: 'super_admin',
      permissions,
    };
  }

  if (session.actor_type === 'staff' && session.staff_id) {
    const staff = await db.getAdminStaffById(session.staff_id);
    if (!staff || !staff.is_active) {
      return guest;
    }
    const permissions = (staff.permissions_json || []).filter((p): p is AdminPermission =>
      STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
    );
    const hasPerm = !requiredPermission || permissions.includes(requiredPermission);
    return {
      authorized: hasPerm,
      authenticated: true,
      actorId: staff.id,
      actorType: 'staff',
      actorName: staff.full_name,
      actorRole: staff.role,
      permissions,
    };
  }

  return guest;
}

export async function requireAdminPermission(
  req: NextRequest,
  requiredPermission?: AdminPermission
): Promise<
  | { ok: true; admin: AdminAuthContext }
  | { ok: false; response: NextResponse }
> {
  const admin = await isAdminAuthenticated(req, requiredPermission);
  if (!admin.authenticated) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'يرجى تسجيل الدخول لبوابة الإدارة' }, { status: 401 }),
    };
  }
  if (!admin.authorized) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ليس لديك صلاحية تنفيذ هذا الإجراء الإداري' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, admin };
}
