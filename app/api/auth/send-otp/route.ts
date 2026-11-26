import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendResalaPin } from '@/lib/resala';
import { checkRateLimit, getClientIp, hashOtp, normalizeLibyanPhone, verifyOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`otp-ip:${ip}`, 15, 10 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: `تم تجاوز حد الطلبات المسموح، يرجى المحاولة بعد ${ipLimit.retryAfterSec} ثانية` },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as { phone?: string };
    const normalized = normalizeLibyanPhone(body.phone || '');
    if (!normalized) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم هاتف ليبي صحيح (يبدأ بـ 091 أو 092 أو 093 أو 094 ويتكون من 10 أرقام)' },
        { status: 400 }
      );
    }

    const phoneCooldown = checkRateLimit(`otp-cooldown:${normalized}`, 1, 30 * 1000);
    if (!phoneCooldown.allowed) {
      return NextResponse.json(
        { error: `يرجى الانتظار ${phoneCooldown.retryAfterSec} ثانية قبل طلب رمز جديد` },
        { status: 429 }
      );
    }

    const phoneHourly = checkRateLimit(`otp-phone:${normalized}`, 6, 15 * 60 * 1000);
    if (!phoneHourly.allowed) {
      return NextResponse.json(
        { error: 'تم طلب عدة رموز لهذا الرقم مؤخراً، يرجى المحاولة بعد قليل' },
        { status: 429 }
      );
    }

    const existingUser = await db.getUserByPhone(normalized);
    if (existingUser?.is_banned) {
      return NextResponse.json(
        { error: 'تم تعليق هذا الحساب. يرجى التواصل مع الدعم الفني.' },
        { status: 403 }
      );
    }

    const resala = await sendResalaPin(normalized);
    if (!resala.ok || !resala.pin) {
      if (resala.errorType === 'InputValidation' || resala.errorType === 'BadRequest') {
        return NextResponse.json(
          { error: 'رقم الهاتف المدخل غير صالح لإرسال رمز التحقق' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'تعذر إرسال رمز التحقق حالياً، يرجى المحاولة بعد قليل' },
        { status: 502 }
      );
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString();
    await db.createOtpSession({
      phone: normalized,
      pin_hash: hashOtp(normalized, resala.pin),
      resala_reference: resala.reference,
      expires_at: expiresAt,
    });

    return NextResponse.json({
      ok: true,
      phone: normalized,
      mode: resala.mode === 'preview_fallback' ? 'preview_fallback' : 'sms_live',
      expiresInSeconds: 300,
      ...(resala.mode === 'preview_fallback' ? { previewCode: resala.pin } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
