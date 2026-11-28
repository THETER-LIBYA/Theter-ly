import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildCookieOptions,
  checkRateLimit,
  generateOpaqueToken,
  getClientIp,
  hashOtp,
  hashToken,
  normalizeLibyanPhone,
  SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  verifyOrigin,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`verify-otp-ip:${ip}`, 20, 10 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'محاولات تحقق كثيرة، يرجى المحاولة بعد قليل' },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      phone?: string;
      code?: string;
      fullName?: string;
    };

    const phone = normalizeLibyanPhone(body.phone || '');
    const code = (body.code || '').trim();
    if (!phone || !/^\d{4,8}$/.test(code)) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو رمز التحقق غير صالح' },
        { status: 400 }
      );
    }

    const otpSession = await db.getLatestOtpSession(phone);
    if (!otpSession) {
      return NextResponse.json(
        { error: 'لا يوجد رمز تحقق نشط لهذا الرقم، يرجى طلب رمز جديد' },
        { status: 400 }
      );
    }

    if (new Date(otpSession.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد' },
        { status: 400 }
      );
    }

    if (otpSession.attempts >= 5) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات المسموح بها، يرجى طلب رمز جديد' },
        { status: 429 }
      );
    }

    const submittedHash = hashOtp(phone, code);
    const a = Buffer.from(submittedHash, 'hex');
    const b = Buffer.from(otpSession.pin_hash, 'hex');
    const isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isMatch) {
      await db.updateOtpSession(otpSession.id, { attempts: otpSession.attempts + 1 });
      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 401 }
      );
    }

    await db.updateOtpSession(otpSession.id, { verified_at: new Date().toISOString() });

    let user = await db.getUserByPhone(phone);
    if (!user) {
      user = await db.upsertUserByPhone(phone, {
        full_name: body.fullName?.trim() || 'عميل ZarnixPay',
        kyc_status: 'unverified',
        onboarding_completed: false,
      });
    } else if (body.fullName?.trim() && (user.full_name === 'عميل ZarnixPay' || user.full_name === 'عميل تيتر ليبيا')) {
      user = (await db.updateUser(user.id, { full_name: body.fullName.trim() })) || user;
    }

    if (user.is_banned) {
      return NextResponse.json(
        { error: 'تم حظر هذا الحساب، يرجى التواصل مع الدعم الفني' },
        { status: 403 }
      );
    }

    const rawToken = generateOpaqueToken();
    const maxAgeSeconds = USER_SESSION_TTL_SECONDS; // 4 days persistent sliding session
    await db.createUserSession({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      user_agent: req.headers.get('user-agent') || null,
      ip_address: ip,
      expires_at: new Date(Date.now() + maxAgeSeconds * 1000).toISOString(),
    });
    user = (await db.updateUser(user.id, { last_active_at: new Date().toISOString() })) || user;

    const res = NextResponse.json({
      ok: true,
      user,
      token: rawToken,
      needsTerms: !user.terms_accepted_at,
      needsOnboarding: !user.onboarding_completed,
    });
    res.cookies.set(SESSION_COOKIE_NAME, rawToken, buildCookieOptions(maxAgeSeconds));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'فشل التحقق من الرمز' },
      { status: 500 }
    );
  }
}
