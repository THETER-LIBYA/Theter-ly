import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, sanitizeUrl, verifyOrigin } from '@/lib/security';
import { SiteContent } from '@/lib/types';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'content');
  if (!check.ok) return check.response;
  const content = await db.getSiteContent();
  return NextResponse.json({ content });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireAdminPermission(req, 'content');
  if (!check.ok) return check.response;
  const { admin } = check;

  const body = (await req.json()) as Partial<SiteContent>;
  const patch: Partial<SiteContent> = {};

  const stringFields: Array<keyof SiteContent> = [
    'app_name_ar',
    'app_name_en',
    'tagline_ar',
    'promo_banner_title',
    'promo_banner_subtitle',
    'primary_color',
    'accent_color',
    'support_phone',
    'support_email',
    'maintenance_message',
  ];

  for (const field of stringFields) {
    if (typeof body[field] === 'string') {
      (patch as Record<string, unknown>)[field] = (body[field] as string).trim();
    }
  }

  const urlFields: Array<keyof SiteContent> = [
    'logo_url',
    'icon_192_url',
    'icon_512_url',
    'icon_maskable_url',
    'apple_touch_icon_url',
    'promo_banner_image_url',
    'support_whatsapp',
    'telegram_url',
    'facebook_url',
  ];

  for (const field of urlFields) {
    if (typeof body[field] === 'string') {
      const clean = sanitizeUrl(body[field] as string);
      if (clean) (patch as Record<string, unknown>)[field] = clean;
    }
  }

  if (typeof body.maintenance_mode === 'boolean') {
    patch.maintenance_mode = body.maintenance_mode;
  }

  if (body.public_pages_json && typeof body.public_pages_json === 'object') {
    const current = await db.getSiteContent();
    const safeIncoming = Object.fromEntries(
      Object.entries(body.public_pages_json).filter(([k]) => !k.startsWith('__'))
    );
    patch.public_pages_json = {
      ...current.public_pages_json,
      ...safeIncoming,
    };
  }

  const updated = await db.updateSiteContent(patch);

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'SITE_CONTENT_UPDATED',
    target_type: 'site_content',
    target_id: 'default',
    details_json: { updatedKeys: Object.keys(patch) },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, content: updated });
}
