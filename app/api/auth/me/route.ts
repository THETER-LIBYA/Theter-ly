import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyAllAdmins } from '@/lib/push';
import {
  buildCookieOptions,
  sanitizeUrl,
  SESSION_COOKIE_NAME,
  USER_SESSION_TTL_SECONDS,
  verifyOrigin,
} from '@/lib/security';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      unreadNotifications: 0,
    });
  }

  const notifications = await db.listUserNotifications(user.id, 50);
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const res = NextResponse.json({
    authenticated: true,
    user,
    unreadNotifications,
  });

  // Renew cookie maxAge on active visit so active users stay signed in seamlessly (expires after 4 days inactivity)
  const existingCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existingCookie) {
    res.cookies.set(SESSION_COOKIE_NAME, existingCookie, buildCookieOptions(USER_SESSION_TTL_SECONDS));
  }
  return res;
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });
  }

  const body = (await req.json()) as {
    accept_terms?: boolean;
    complete_onboarding?: boolean;
    reverify_kyc?: boolean;
    first_name?: string;
    last_name?: string;
    city_area?: string;
    passport_image_url?: string;
    birth_cert_image_url?: string;
    full_name?: string;
    email?: string;
    request_kyc?: boolean;
  };

  const patch: Parameters<typeof db.updateUser>[1] = {};

  if (body.accept_terms) {
    patch.terms_accepted_at = user.terms_accepted_at || new Date().toISOString();
  }

  if (body.complete_onboarding || body.reverify_kyc) {
    if (!user.terms_accepted_at && !body.accept_terms) {
      return NextResponse.json(
        { error: 'يجب الموافقة على الشروط والأحكام أولاً' },
        { status: 400 }
      );
    }

    const firstName = (body.first_name ?? user.first_name ?? '').trim();
    const lastName = (body.last_name ?? user.last_name ?? '').trim();
    const cityArea = (body.city_area ?? user.city_area ?? '').trim();
    const passportUrl = sanitizeUrl(body.passport_image_url ?? user.passport_image_url);
    const birthCertUrl = sanitizeUrl(body.birth_cert_image_url ?? user.birth_cert_image_url);

    if (firstName.length < 2 || lastName.length < 2) {
      return NextResponse.json(
        { error: 'يرجى إدخال الاسم واللقب بشكل صحيح' },
        { status: 400 }
      );
    }
    if (cityArea.length < 3) {
      return NextResponse.json(
        { error: 'يرجى تحديد المدينة والمنطقة في ليبيا' },
        { status: 400 }
      );
    }
    if (!passportUrl.startsWith('/api/files/kyc/') || !birthCertUrl.startsWith('/api/files/kyc/')) {
      return NextResponse.json(
        { error: 'يرجى رفع صورة جواز السفر وصورة شهادة الميلاد بشكل صحيح' },
        { status: 400 }
      );
    }

    patch.first_name = firstName.slice(0, 60);
    patch.last_name = lastName.slice(0, 60);
    patch.full_name = `${patch.first_name} ${patch.last_name}`;
    patch.city_area = cityArea.slice(0, 120);
    patch.passport_image_url = passportUrl;
    patch.birth_cert_image_url = birthCertUrl;
    patch.onboarding_completed = true;
    patch.kyc_status = user.kyc_status === 'verified' ? 'verified' : 'pending';
    patch.kyc_note = null;
  } else {
    if (typeof body.first_name === 'string' && body.first_name.trim().length >= 2) {
      patch.first_name = body.first_name.trim().slice(0, 60);
    }
    if (typeof body.last_name === 'string' && body.last_name.trim().length >= 2) {
      patch.last_name = body.last_name.trim().slice(0, 60);
    }
    if (typeof body.city_area === 'string' && body.city_area.trim().length >= 3) {
      patch.city_area = body.city_area.trim().slice(0, 120);
    }
    if (typeof body.full_name === 'string' && body.full_name.trim().length >= 3) {
      patch.full_name = body.full_name.trim().slice(0, 80);
    } else if (patch.first_name || patch.last_name) {
      patch.full_name = `${patch.first_name ?? user.first_name ?? ''} ${patch.last_name ?? user.last_name ?? ''}`.trim();
    }
    if (typeof body.email === 'string') {
      patch.email = body.email.trim().slice(0, 120) || null;
    }
    if (body.request_kyc && (user.kyc_status === 'unverified' || user.kyc_status === 'needs_reverification')) {
      patch.kyc_status = 'pending';
      patch.kyc_note = null;
    }
  }

  const updated = await db.updateUser(user.id, patch);

  if (updated && (body.complete_onboarding || body.reverify_kyc || patch.kyc_status === 'pending')) {
    await notifyAllAdmins({
      fallbackTitle: body.reverify_kyc
        ? `إعادة رفع مستندات التوثيق — ${updated.full_name}`
        : `مستخدم جديد أكمل التوثيق — ${updated.full_name}`,
      fallbackBody: `${updated.full_name} (${updated.city_area || 'ليبيا'}) (+${updated.phone}) أرسل صورة جواز السفر وشهادة الميلاد للمراجعة.`,
      actionUrl: '/admin?tab=users',
    });
  }

  return NextResponse.json({ ok: true, user: updated });
}
