import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, verifyOrigin } from '@/lib/security';
import {
  ADMIN_PERMISSIONS_DIRECTORY,
  AdminPermission,
  STAFF_ASSIGNABLE_PERMISSIONS,
} from '@/lib/types';

async function requireSuperAdmin(req: NextRequest) {
  const check = await requireAdminPermission(req, 'staff');
  if (!check.ok) return check;
  if (check.admin.actorType !== 'super_admin') {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'إدارة الأدوار ومصفوفة الصلاحيات مخصصة للمدير العام فقط' },
        { status: 403 }
      ),
    };
  }
  return check;
}

const SLUG_REGEX = /^[a-z0-9_-]{2,40}$/;

function buildSafeSlug(rawSlug: string | undefined): string {
  const cleaned = (rawSlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleaned.length >= 2 && SLUG_REGEX.test(cleaned) && cleaned !== 'super_admin') {
    return cleaned;
  }
  return `custom_${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET(req: NextRequest) {
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const [roles, staff] = await Promise.all([db.listAdminRoles(), db.listAdminStaff()]);
  const countMap = new Map<string, number>();
  for (const s of staff) {
    countMap.set(s.role, (countMap.get(s.role) || 0) + 1);
  }

  return NextResponse.json({
    roles: roles.map((r) => ({
      ...r,
      staffCount: countMap.get(r.slug) || 0,
    })),
    permissionDirectory: ADMIN_PERMISSIONS_DIRECTORY,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const body = (await req.json()) as {
    name_ar?: string;
    slug?: string;
    description_ar?: string;
    permissions?: AdminPermission[];
  };

  const nameAr = (body.name_ar || '').trim();
  if (nameAr.length < 2) {
    return NextResponse.json({ error: 'يرجى إدخال اسم الدور المخصص' }, { status: 400 });
  }

  const permissions = Array.isArray(body.permissions)
    ? Array.from(
        new Set(
          body.permissions.filter((p): p is AdminPermission =>
            STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
          )
        )
      )
    : [];

  if (permissions.length === 0) {
    return NextResponse.json(
      { error: 'يرجى تحديد صلاحية واحدة على الأقل للدور المخصص' },
      { status: 400 }
    );
  }

  let slug = buildSafeSlug(body.slug);
  const existing = await db.getAdminRoleBySlug(slug);
  if (existing) {
    if (body.slug?.trim()) {
      return NextResponse.json({ error: 'المعرّف البرمجي للدور مستخدم بالفعل' }, { status: 409 });
    }
    slug = `custom_${crypto.randomUUID().slice(0, 8)}`;
  }

  const created = await db.createAdminRole({
    slug,
    name_ar: nameAr,
    description_ar: body.description_ar?.trim() || '',
    permissions_json: permissions,
  });

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'ROLE_CREATED',
    target_type: 'admin_role',
    target_id: created.id,
    details_json: {
      slug: created.slug,
      name_ar: created.name_ar,
      permissions: created.permissions_json,
    },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, role: { ...created, staffCount: 0 } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const body = (await req.json()) as {
    id?: string;
    name_ar?: string;
    description_ar?: string;
    permissions?: AdminPermission[];
  };

  if (!body.id) {
    return NextResponse.json({ error: 'معرف الدور مطلوب' }, { status: 400 });
  }

  const existing = await db.getAdminRoleById(body.id);
  if (!existing) {
    return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });
  }

  const permissions = Array.isArray(body.permissions)
    ? Array.from(
        new Set(
          body.permissions.filter((p): p is AdminPermission =>
            STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
          )
        )
      )
    : undefined;

  if (permissions && permissions.length === 0) {
    return NextResponse.json(
      { error: 'يجب أن يحتوي الدور على صلاحية واحدة على الأقل' },
      { status: 400 }
    );
  }

  const updated = await db.updateAdminRole(body.id, {
    ...(typeof body.name_ar === 'string' && body.name_ar.trim().length >= 2
      ? { name_ar: body.name_ar.trim() }
      : {}),
    ...(typeof body.description_ar === 'string' ? { description_ar: body.description_ar.trim() } : {}),
    ...(permissions ? { permissions_json: permissions } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: 'تعذر تحديث الدور' }, { status: 500 });
  }

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'ROLE_UPDATED',
    target_type: 'admin_role',
    target_id: updated.id,
    details_json: {
      slug: updated.slug,
      name_ar: updated.name_ar,
      permissions: updated.permissions_json,
    },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, role: updated });
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'معرف الدور مطلوب' }, { status: 400 });
  }

  const existing = await db.getAdminRoleById(id);
  if (!existing) {
    return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });
  }
  if (existing.is_system) {
    return NextResponse.json(
      { error: 'لا يمكن حذف الأدوار القياسية للنظام، يمكنك تعديل صلاحياتها فقط' },
      { status: 400 }
    );
  }

  const staff = await db.listAdminStaff();
  const assignedCount = staff.filter((s) => s.role === existing.slug).length;
  if (assignedCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف هذا الدور لأن هناك ${assignedCount} موظف مرتبط به حالياً` },
      { status: 409 }
    );
  }

  await db.deleteAdminRole(id);

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'ROLE_DELETED',
    target_type: 'admin_role',
    target_id: id,
    details_json: { slug: existing.slug, name_ar: existing.name_ar },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
