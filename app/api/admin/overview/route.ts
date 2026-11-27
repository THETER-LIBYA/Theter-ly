import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { isVapidEnvConfigured } from '@/lib/push';
import { isResalaConfigured } from '@/lib/resala';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'overview');
  if (!check.ok) return check.response;

  const [users, orders, ledger, rates, auditLogs] = await Promise.all([
    db.listUsers(),
    db.listOrders({ limit: 500 }),
    db.listLedgerEntries(500),
    db.getExchangeRates(),
    db.listAuditLogs(20),
  ]);

  const buyOrders = orders.filter((o) => o.type === 'buy');
  const sellOrders = orders.filter((o) => o.type === 'sell');
  const pendingOrders = orders.filter((o) => ['pending_review', 'under_review', 'needs_edit', 'approved'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const rejectedOrders = orders.filter((o) => o.status === 'rejected');

  const totalVolumeUsdt = completedOrders.reduce((sum, o) => sum + Number(o.usdt_amount || 0), 0);
  const totalVolumeLyd = completedOrders.reduce((sum, o) => sum + Number(o.lyd_amount || 0), 0);

  const totalMarginProfitLyd = ledger
    .filter((l) => l.entry_type === 'platform_margin' && l.currency === 'LYD')
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  // Daily aggregation (last 7 days) & Monthly aggregation
  const dailyMap = new Map<string, { date: string; usdt: number; count: number; profitLyd: number }>();
  const monthlyMap = new Map<string, { month: string; usdt: number; count: number; profitLyd: number }>();

  for (const order of completedOrders) {
    const day = order.created_at.slice(0, 10);
    const month = order.created_at.slice(0, 7);
    const estProfit =
      order.type === 'buy'
        ? Number(order.usdt_amount) * Math.max(0, Number(rates.buy_margin))
        : Number(order.usdt_amount) * Math.max(0, Math.abs(Number(rates.sell_margin)));

    const d = dailyMap.get(day) || { date: day, usdt: 0, count: 0, profitLyd: 0 };
    d.usdt += Number(order.usdt_amount);
    d.count += 1;
    d.profitLyd += estProfit;
    dailyMap.set(day, d);

    const m = monthlyMap.get(month) || { month, usdt: 0, count: 0, profitLyd: 0 };
    m.usdt += Number(order.usdt_amount);
    m.count += 1;
    m.profitLyd += estProfit;
    monthlyMap.set(month, m);
  }

  return NextResponse.json({
    kpis: {
      totalUsers: users.length,
      buyOrdersCount: buyOrders.length,
      sellOrdersCount: sellOrders.length,
      pendingOrdersCount: pendingOrders.length,
      completedOrdersCount: completedOrders.length,
      rejectedOrdersCount: rejectedOrders.length,
      totalVolumeUsdt,
      totalVolumeLyd,
      totalMarginProfitLyd,
    },
    dailyStats: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    monthlyStats: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    recentOrders: orders.slice(0, 8),
    recentAuditLogs: auditLogs,
    integrations: {
      supabaseConnected: isSupabaseConfigured(),
      resalaConnected: isResalaConfigured(),
      vapidEnvConfigured: isVapidEnvConfigured(),
      adminPasscodeEnvConfigured: Boolean(process.env.ADMIN_PASSCODE?.trim()),
    },
  });
}
