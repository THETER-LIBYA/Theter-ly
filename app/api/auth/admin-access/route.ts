import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db, SUPER_ADMIN_ACTOR_ID } from '@/lib/db';
import {
  ADMIN_COOKIE_NAME,
  buildCookieOptions,
  checkRateLimit,
  generateOpaqueToken,
  getClientIp,
  hashPassword,
  hashToken,
  verifyOrigin,
  verifyPassword,
} from '@/lib/security';
import { ALL_ADMIN_PERMISSIONS, STAFF_ASSIGNABLE_PERMISSIONS } from '@/lib/types';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
  const claimedHash = await db.getAdminCredentialHash();

  return NextResponse.json({
    authorized: admin.authenticated && admin.authorized,
    actorId: admin.actorId,
    actorType: admin.actorType,
    actorName: admin.actorName,
    actorRole: admin.actorRole,
    permissions: admin.permissions,
    needsFirstRunClaim: !envConfigured && !claimedHash,
    envPasscodeActive: envConfigured,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `تم تجاوز عدد محاولات الدخول، يرجى الانتظار ${limit.retryAfterSec} ثانية` },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      mode?: 'super_admin' | 'staff';
      passcode?: string;
      action?: 'login' | 'claim';
      username?: string;
      password?: string;
    };

    const maxAgeSeconds = 60 * 60 * 12; // 12 hours
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();
    const rawToken = generateOpaqueToken();
    const userAgent = req.headers.get('user-agent') || null;

    if (body.mode === 'staff') {
      const username = (body.username || '').trim().toLowerCase();
      const password = body.password || '';
      if (!username || password.length < 6) {
        return NextResponse.json(
          { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
          { status: 400 }
        );
      }

      const staff = await db.getAdminStaffByUsername(username);
      if (!staff || !verifyPassword(password, staff.password_hash)) {
        return NextResponse.json(
          { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
          { status: 401 }
        );
      }

      if (!staff.is_active) {
        return NextResponse.json(
          { error: 'تم إيقاف هذا الحساب من قبل المدير العام' },
          { status: 403 }
        );
      }

      const permissions = (staff.permissions_json || []).filter((p) =>
        STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
      );

      await db.updateAdminStaff(staff.id, { last_login_at: new Date().toISOString() });
      await db.createAdminSession({
        actor_type: 'staff',
        staff_id: staff.id,
        actor_name: staff.full_name,
        actor_role: staff.role,
        token_hash: hashToken(rawToken),
        user_agent: userAgent,
        ip_address: ip,
        expires_at: expiresAt,
      });

      await db.appendAuditLog({
        actor_id: staff.id,
        actor_role: staff.role,
        action: 'STAFF_LOGIN',
        target_type: 'admin_session',
        target_id: staff.id,
        details_json: { username: staff.username },
        ip_address: ip,
      });

      const res = NextResponse.json({
        ok: true,
        actor: {
          actorId: staff.id,
          actorType: 'staff',
          actorName: staff.full_name,
          actorRole: staff.role,
          permissions,
        },
      });
      res.cookies.set(ADMIN_COOKIE_NAME, rawToken, buildCookieOptions(maxAgeSeconds));
      return res;
    }

    // Super Admin authentication (via ADMIN_PASSCODE env or first-run claim)
    const passcode = (body.passcode || '').trim();
    if (passcode.length < 6) {
      return NextResponse.json(
        { error: 'كلمة مرور المدير العام يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const claimedHash = await db.getAdminCredentialHash();

    if (body.action === 'claim') {
      if (envPasscode || claimedHash) {
        return NextResponse.json(
          { error: 'تم إعداد حساب المدير العام مسبقاً، يرجى تسجيل الدخول' },
          { status: 409 }
        );
      }
      await db.setAdminCredentialHash(hashPassword(passcode));
    } else {
      if (envPasscode) {
        const a = Buffer.from(passcode);
        const b = Buffer.from(envPasscode);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return NextResponse.json({ error: 'رمز المدير العام غير صحيح' }, { status: 401 });
        }
      } else if (claimedHash) {
        if (!verifyPassword(passcode, claimedHash)) {
          return NextResponse.json({ error: 'رمز المدير العام غير صحيح' }, { status: 401 });
        }
      } else {
        return NextResponse.json(
          { error: 'يرجى تهيئة كلمة مرور المدير العام أولاً' },
          { status: 400 }
        );
      }
    }

    await db.createAdminSession({
      actor_type: 'super_admin',
      staff_id: null,
      actor_name: 'المدير العام',
      actor_role: 'super_admin',
      token_hash: hashToken(rawToken),
      user_agent: userAgent,
      ip_address: ip,
      expires_at: expiresAt,
    });

    await db.appendAuditLog({
      actor_id: SUPER_ADMIN_ACTOR_ID,
      actor_role: 'super_admin',
      action: body.action === 'claim' ? 'ADMIN_FIRST_RUN_CLAIM' : 'SUPER_ADMIN_LOGIN',
      target_type: 'admin_session',
      target_id: SUPER_ADMIN_ACTOR_ID,
      details_json: { method: envPasscode ? 'env_passcode' : 'claimed_passcode' },
      ip_address: ip,
    });

    const res = NextResponse.json({
      ok: true,
      actor: {
        actorId: SUPER_ADMIN_ACTOR_ID,
        actorType: 'super_admin',
        actorName: 'المدير العام',
        actorRole: 'super_admin',
        permissions: ALL_ADMIN_PERMISSIONS,
      },
    });
    res.cookies.set(ADMIN_COOKIE_NAME, rawToken, buildCookieOptions(maxAgeSeconds));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'فشل التحقق الإداري' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const adminToken =
    req.headers.get('x-admin-token') || req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (adminToken) {
    await db.revokeAdminSession(hashToken(adminToken));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, '', buildCookieOptions(0));
  return res;
}
