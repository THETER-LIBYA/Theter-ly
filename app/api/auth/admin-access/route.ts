import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
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

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
  const claimedHash = await db.getAdminCredentialHash();

  return NextResponse.json({
    authorized: admin.authorized,
    actorRole: admin.actorRole,
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
      passcode?: string;
      action?: 'login' | 'claim';
      adminName?: string;
      adminPhone?: string;
    };

    const passcode = (body.passcode || '').trim();
    if (passcode.length < 6) {
      return NextResponse.json(
        { error: 'كلمة مرور الإدارة يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const claimedHash = await db.getAdminCredentialHash();

    if (body.action === 'claim') {
      if (envPasscode || claimedHash) {
        return NextResponse.json(
          { error: 'تم إعداد حساب الإدارة مسبقاً، يرجى تسجيل الدخول' },
          { status: 409 }
        );
      }
      const newHash = hashPassword(passcode);
      await db.setAdminCredentialHash(newHash);
    } else {
      if (envPasscode) {
        const a = Buffer.from(passcode);
        const b = Buffer.from(envPasscode);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return NextResponse.json({ error: 'رمز الإدارة غير صحيح' }, { status: 401 });
        }
      } else if (claimedHash) {
        if (!verifyPassword(passcode, claimedHash)) {
          return NextResponse.json({ error: 'رمز الإدارة غير صحيح' }, { status: 401 });
        }
      } else {
        return NextResponse.json(
          { error: 'يرجى تهيئة كلمة مرور المشرف الأول أولاً' },
          { status: 400 }
        );
      }
    }

    const phone = body.adminPhone?.replace(/\D/g, '') || '218910000001';
    let adminUser = await db.getUserByPhone(phone);
    if (!adminUser) {
      adminUser = await db.upsertUserByPhone(phone, {
        full_name: body.adminName?.trim() || 'المدير العام — تيتر ليبيا',
        kyc_status: 'verified',
        role: 'super_admin',
      });
    } else if (adminUser.role === 'user') {
      adminUser = (await db.updateUser(adminUser.id, { role: 'super_admin', kyc_status: 'verified' })) || adminUser;
    }

    const rawToken = generateOpaqueToken();
    const maxAgeSeconds = 60 * 60 * 12; // 12 hours
    await db.createUserSession({
      user_id: adminUser.id,
      token_hash: hashToken(rawToken),
      user_agent: req.headers.get('user-agent') || null,
      ip_address: getClientIp(req),
      expires_at: new Date(Date.now() + maxAgeSeconds * 1000).toISOString(),
    });

    await db.appendAuditLog({
      actor_id: adminUser.id,
      actor_role: adminUser.role,
      action: body.action === 'claim' ? 'ADMIN_FIRST_RUN_CLAIM' : 'ADMIN_LOGIN',
      target_type: 'admin_session',
      target_id: adminUser.id,
      details_json: { phone: adminUser.phone },
      ip_address: getClientIp(req),
    });

    const res = NextResponse.json({
      ok: true,
      adminUser,
      adminToken: rawToken,
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
    await db.revokeUserSession(hashToken(adminToken));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, '', buildCookieOptions(0));
  return res;
}
