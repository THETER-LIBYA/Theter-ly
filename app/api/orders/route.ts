import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const scopeAll = req.nextUrl.searchParams.get('scope') === 'all';
  const admin = await isAdminAuthenticated(req, scopeAll ? 'orders' : undefined);

  if (!user && !admin.authorized) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول لعرض العمليات' }, { status: 401 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit') || 50);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

  if (admin.authorized && scopeAll) {
    const orders = await db.listOrders({ limit });
    return NextResponse.json({ orders });
  }

  if (!user) {
    return NextResponse.json({ orders: [] });
  }

  const orders = await db.listOrders({ userId: user.id, limit });
  return NextResponse.json({ orders });
}
