import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, verifyOrigin } from '@/lib/security';
import { SeoSetting } from '@/lib/types';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const seoList = await db.listSeoSettings();
  return NextResponse.json({ seoList });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const body = (await req.json()) as Partial<SeoSetting> & { page_slug?: string };
  if (!body.page_slug?.trim()) {
    return NextResponse.json({ error: 'معرف الصفحة (page_slug) مطلوب' }, { status: 400 });
  }

  const saved = await db.upsertSeoSetting({
    ...body,
    page_slug: body.page_slug.trim().toLowerCase(),
  });

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'SEO_SETTING_UPDATED',
    target_type: 'seo_settings',
    target_id: saved.page_slug,
    details_json: { title: saved.title, noindex: saved.noindex },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, seo: saved });
}
