import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrderStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'orders');
  if (!check.ok) return check.response;

  const statusParam = req.nextUrl.searchParams.get('status') as OrderStatus | null;
  const typeParam = req.nextUrl.searchParams.get('type') as 'buy' | 'sell' | null;

  const [orders, users, accounts, wallets] = await Promise.all([
    db.listOrders({
      status: statusParam || undefined,
      type: typeParam || undefined,
      limit: 200,
    }),
    db.listUsers(),
    db.listPaymentAccounts(false),
    db.listPlatformWallets(false),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const walletMap = new Map(wallets.map((w) => [w.id, w]));

  const enriched = orders.map((order) => ({
    ...order,
    user: userMap.get(order.user_id) || null,
    bank_account: order.bank_account_id ? accountMap.get(order.bank_account_id) || null : null,
    platform_wallet: order.platform_wallet_id ? walletMap.get(order.platform_wallet_id) || null : null,
  }));

  return NextResponse.json({ orders: enriched });
}
