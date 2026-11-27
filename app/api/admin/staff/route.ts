import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, hashPassword, verifyOrigin } from '@/lib/security';
import {
  ADMIN_PERMISSION_LABELS,
  AdminPermission,
  AdminStaff,
  STAFF_ASSIGNABLE_PERMISSIONS,
  STAFF_ROLE_DEFAULT_PERMISSIONS,
  STAFF_ROLE_LABELS,
  StaffRole,
} from '@/lib/types';

function sanitizeStaff(staff: AdminStaff) {
  return {
    id: staff.id,
    full_name: staff.full_name,
    username: staff.username,
    role: staff.role,
    permissions_json: (staff.permissions_json || []).filter((p) =>
      STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
    ),
    is_active: staff.is_active,
    last_login_at: staff.last_login_at,
    created_at: staff.created_at,
    updated_at: staff.updated_at,
  };
}

async function requireSuperAdmin(req: NextRequest) {
  const check = await requireAdminPermission(req, 'staff');
  if (!check.ok) return check;
  if (check.admin.actorType !== 'super_admin') {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'إدارة طاقم العمل والأدوار مخصصة للمدير العام فقط' },
        { status: 403 }
      ),
    };
  }
  return check;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function GET(req: NextRequest) {
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const [list, roles] = await Promise.all([db.listAdminStaff(), db.listAdminRoles()]);
  return NextResponse.json({
    staff: list.map(sanitizeStaff),
    roles,
    roleLabels: STAFF_ROLE_LABELS,
    roleDefaultPermissions: STAFF_ROLE_DEFAULT_PERMISSIONS,
    permissionLabels: ADMIN_PERMISSION_LABELS,
    assignablePermissions: STAFF_ASSIGNABLE_PERMISSIONS,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const body = (await req.json()) as {
    full_name?: string;
    username?: string;
    password?: string;
    role?: StaffRole;
    permissions?: AdminPermission[];
  };

  const fullName = (body.full_name || '').trim();
  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  const roleSlug = (body.role || '').trim().toLowerCase();

  if (fullName.length < 2) {
    return NextResponse.json({ error: 'يرجى إدخال الاسم الكامل للموظف' }, { status: 400 });
  }
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً إنجليزياً أو رقماً (بدون مسافات)' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
      { status: 400 }
    );
  }

  const matchedRole = await db.getAdminRoleBySlug(roleSlug);
  const defaultRolePerms = matchedRole?.permissions_json || STAFF_ROLE_DEFAULT_PERMISSIONS[roleSlug];
  if (!matchedRole && !defaultRolePerms) {
    return NextResponse.json({ error: 'الدور الوظيفي المختار غير موجود' }, { status: 400 });
  }

  const existing = await db.getAdminStaffByUsername(username);
  if (existing) {
    return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 });
  }

  const requestedPerms = Array.isArray(body.permissions)
    ? body.permissions.filter((p): p is AdminPermission =>
        STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
      )
    : [];
  const permissions =
    requestedPerms.length > 0 ? Array.from(new Set(requestedPerms)) : defaultRolePerms || ['overview'];

  const created = await db.createAdminStaff({
    full_name: fullName,
    username,
    password_hash: hashPassword(password),
    role: roleSlug,
    permissions_json: permissions,
  });

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'STAFF_CREATED',
    target_type: 'admin_staff',
    target_id: created.id,
    details_json: {
      username: created.username,
      role: created.role,
      permissions: created.permissions_json,
    },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, staff: sanitizeStaff(created) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const body = (await req.json()) as {
    id?: string;
    full_name?: string;
    role?: StaffRole;
    permissions?: AdminPermission[];
    is_active?: boolean;
    newPassword?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'معرف حساب الموظف مطلوب' }, { status: 400 });
  }

  const existing = await db.getAdminStaffById(body.id);
  if (!existing) {
    return NextResponse.json({ error: 'حساب الموظف غير موجود' }, { status: 404 });
  }

  const patch: Partial<AdminStaff> = {};
  if (typeof body.full_name === 'string' && body.full_name.trim().length >= 2) {
    patch.full_name = body.full_name.trim();
  }
  if (body.role) {
    const cleanRole = body.role.trim().toLowerCase();
    const matchedRole = await db.getAdminRoleBySlug(cleanRole);
    if (!matchedRole && !STAFF_ROLE_DEFAULT_PERMISSIONS[cleanRole]) {
      return NextResponse.json({ error: 'الدور الوظيفي غير موجود' }, { status: 400 });
    }
    patch.role = cleanRole;
  }
  if (Array.isArray(body.permissions)) {
    patch.permissions_json = Array.from(
      new Set(
        body.permissions.filter((p): p is AdminPermission =>
          STAFF_ASSIGNABLE_PERMISSIONS.includes(p)
        )
      )
    );
  }
  if (typeof body.is_active === 'boolean') {
    patch.is_active = body.is_active;
  }
  if (typeof body.newPassword === 'string' && body.newPassword.length > 0) {
    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }
    patch.password_hash = hashPassword(body.newPassword);
  }

  const updated = await db.updateAdminStaff(body.id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'تعذر تحديث حساب الموظف' }, { status: 500 });
  }

  if (body.is_active === false || (typeof body.newPassword === 'string' && body.newPassword.length > 0)) {
    await db.revokeStaffSessions(updated.id);
  }

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'STAFF_UPDATED',
    target_type: 'admin_staff',
    target_id: updated.id,
    details_json: {
      role: updated.role,
      is_active: updated.is_active,
      permissions: updated.permissions_json,
      passwordReset: Boolean(body.newPassword),
    },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true, staff: sanitizeStaff(updated) });
}

export async function DELETE(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireSuperAdmin(req);
  if (!check.ok) return check.response;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'معرف حساب الموظف مطلوب' }, { status: 400 });
  }

  const existing = await db.getAdminStaffById(id);
  if (!existing) {
    return NextResponse.json({ error: 'حساب الموظف غير موجود' }, { status: 404 });
  }

  await db.revokeStaffSessions(id);
  await db.deleteAdminStaff(id);

  await db.appendAuditLog({
    actor_id: check.admin.actorId,
    actor_role: check.admin.actorRole,
    action: 'STAFF_DELETED',
    target_type: 'admin_staff',
    target_id: id,
    details_json: { username: existing.username, role: existing.role },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
