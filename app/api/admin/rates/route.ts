import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOrRefreshRates } from '@/lib/prices';
import { dispatchNotification } from '@/lib/push';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'rates');
  if (!check.ok) return check.response;
  const rates = await db.getExchangeRates();
  return NextResponse.json({ rates });
}

export async function PATCH(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }
  const check = await requireAdminPermission(req, 'rates');
  if (!check.ok) return check.response;
  const { admin } = check;

  const body = (await req.json()) as {
    syncNow?: boolean;
    notifyUsers?: boolean;
    source?: 'prices_ly' | 'manual';
    base_usd_lyd?: number;
    buy_margin?: number;
    sell_margin?: number;
    buy_rate?: number;
    sell_rate?: number;
    auto_update_enabled?: boolean;
    buy_enabled?: boolean;
    sell_enabled?: boolean;
    min_order_usdt?: number;
    max_order_usdt?: number;
  };

  let updated;
  if (body.syncNow) {
    const res = await getOrRefreshRates(true);
    updated = res.rates;
  } else {
    const current = await db.getExchangeRates();
    const source = body.source ?? current.source;
    const base = body.base_usd_lyd !== undefined ? Number(body.base_usd_lyd) : Number(current.base_usd_lyd);
    const buyMargin = body.buy_margin !== undefined ? Number(body.buy_margin) : Number(current.buy_margin);
    const sellMargin = body.sell_margin !== undefined ? Number(body.sell_margin) : Number(current.sell_margin);

    const buyRate =
      source === 'manual' && body.buy_rate !== undefined
        ? Number(body.buy_rate)
        : Math.round((base + buyMargin) * 1000) / 1000;
    const sellRate =
      source === 'manual' && body.sell_rate !== undefined
        ? Number(body.sell_rate)
        : Math.round((base + sellMargin) * 1000) / 1000;

    updated = await db.updateExchangeRates({
      source,
      base_usd_lyd: base,
      buy_margin: buyMargin,
      sell_margin: sellMargin,
      buy_rate: Math.max(0.1, buyRate),
      sell_rate: Math.max(0.1, sellRate),
      auto_update_enabled: body.auto_update_enabled ?? current.auto_update_enabled,
      buy_enabled: body.buy_enabled ?? current.buy_enabled,
      sell_enabled: body.sell_enabled ?? current.sell_enabled,
      min_order_usdt: body.min_order_usdt !== undefined ? Number(body.min_order_usdt) : current.min_order_usdt,
      max_order_usdt: body.max_order_usdt !== undefined ? Number(body.max_order_usdt) : current.max_order_usdt,
      last_fetched_at: new Date().toISOString(),
      updated_by: admin.actorId,
    });
  }

  await db.appendAuditLog({
    actor_id: admin.actorId,
    actor_role: admin.actorRole,
    action: 'RATES_UPDATED',
    target_type: 'exchange_rates',
    target_id: 'default',
    details_json: {
      buy_rate: updated.buy_rate,
      sell_rate: updated.sell_rate,
      source: updated.source,
      auto_update_enabled: updated.auto_update_enabled,
    },
    ip_address: getClientIp(req),
  });

  if (body.notifyUsers) {
    const users = await db.listUsers();
    await Promise.all(
      users
        .filter((u) => !u.is_banned)
        .map((u) =>
          dispatchNotification({
            userId: u.id,
            templateKey: 'rate_updated',
            type: 'rate_alerts',
            fallbackTitle: 'تحديث أسعار USDT في ZarnixPay',
            fallbackBody: `سعر الشراء: ${updated.buy_rate} د.ل | سعر البيع: ${updated.sell_rate} د.ل`,
            vars: {
              buy_rate: updated.buy_rate.toFixed(3),
              sell_rate: updated.sell_rate.toFixed(3),
            },
            actionUrl: '/',
          })
        )
    );
  }

  return NextResponse.json({ ok: true, rates: updated });
}
