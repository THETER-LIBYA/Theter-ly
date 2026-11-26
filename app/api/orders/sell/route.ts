import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchNotification, notifyAllAdmins } from '@/lib/push';
import { isValidTxHash, verifyOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });
  }
  if (!user.terms_accepted_at || !user.onboarding_completed) {
    return NextResponse.json(
      { error: 'يرجى الموافقة على الشروط والأحكام واستكمال بيانات التوثيق أولاً' },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as {
      usdtAmount?: number | string;
      platformWalletId?: string;
      txHash?: string;
      recipientFullName?: string;
      recipientBank?: string;
      recipientAccountNumber?: string;
      recipientIban?: string;
      idempotencyKey?: string;
    };

    const [rates, siteContent] = await Promise.all([
      db.getExchangeRates(),
      db.getSiteContent(),
    ]);
    if (siteContent.maintenance_mode) {
      return NextResponse.json(
        { error: siteContent.maintenance_message || 'المنصة تحت الصيانة حالياً' },
        { status: 503 }
      );
    }
    if (!rates.sell_enabled) {
      return NextResponse.json(
        { error: 'خدمة بيع USDT متوقفة مؤقتاً من قبل الإدارة' },
        { status: 403 }
      );
    }

    const usdtAmount = Number(body.usdtAmount);
    if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
      return NextResponse.json({ error: 'كمية USDT غير صالحة' }, { status: 400 });
    }
    if (usdtAmount < rates.min_order_usdt || usdtAmount > rates.max_order_usdt) {
      return NextResponse.json(
        {
          error: `الحد المسموح للبيع بين ${rates.min_order_usdt} و ${rates.max_order_usdt} USDT`,
        },
        { status: 400 }
      );
    }

    const txHash = (body.txHash || '').trim();
    if (!isValidTxHash(txHash)) {
      return NextResponse.json(
        { error: 'معرف المعاملة (Transaction Hash) غير صالح — يجب أن يتكون من 64 خانة ست عشرية' },
        { status: 400 }
      );
    }

    const duplicateHash = await db.getOrderByTxHash(txHash);
    if (duplicateHash) {
      return NextResponse.json(
        { error: 'معرف المعاملة (Transaction Hash) مستخدم مسبقاً في طلب آخر' },
        { status: 409 }
      );
    }

    const recipientFullName = (body.recipientFullName || '').trim();
    const recipientBank = (body.recipientBank || '').trim();
    const recipientAccountNumber = (body.recipientAccountNumber || '').trim();
    const recipientIban = (body.recipientIban || '').trim() || null;

    if (recipientFullName.length < 4 || recipientBank.length < 2 || recipientAccountNumber.length < 4) {
      return NextResponse.json(
        { error: 'يرجى إدخال الاسم الثلاثي والمصرف ورقم الحساب بشكل كامل' },
        { status: 400 }
      );
    }

    const wallets = await db.listPlatformWallets(true);
    const activeWallet = wallets.find((w) => w.id === body.platformWalletId) || wallets[0];
    if (!activeWallet) {
      return NextResponse.json(
        { error: 'لا توجد محفظة استقبال نشطة للمنصة حالياً' },
        { status: 400 }
      );
    }

    const idempotencyKey = (body.idempotencyKey || '').trim() || `sell-${user.id}-${txHash}`;
    const existing = await db.getOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      return NextResponse.json({ ok: true, order: existing, deduplicated: true });
    }

    // Server-authoritative LYD calculation
    const rateApplied = Number(rates.sell_rate);
    const lydAmount = Math.round(usdtAmount * rateApplied * 1000) / 1000;

    const order = await db.createOrder({
      idempotency_key: idempotencyKey,
      user_id: user.id,
      type: 'sell',
      usdt_amount: usdtAmount,
      rate_applied: rateApplied,
      lyd_amount: lydAmount,
      payment_method: 'tron_trc20',
      bank_account_id: null,
      platform_wallet_id: activeWallet.id,
      sender_name: null,
      sender_bank: null,
      transfer_reference: null,
      receipt_url: null,
      customer_wallet_address: activeWallet.address,
      network: 'TRC20',
      tx_hash: txHash,
      recipient_full_name: recipientFullName,
      recipient_bank: recipientBank,
      recipient_account_number: recipientAccountNumber,
      recipient_iban: recipientIban,
      status: 'pending_review',
      admin_notes: null,
      outbound_transfer_ref: null,
      outbound_proof_url: null,
      reviewed_by: null,
    });

    await dispatchNotification({
      userId: user.id,
      templateKey: 'order_created',
      type: 'order_updates',
      fallbackTitle: `تم استلام طلب البيع #${order.order_number}`,
      fallbackBody: `طلب بيع ${order.usdt_amount} USDT بقيمة ${order.lyd_amount} د.ل قيد المراجعة الإدارية.`,
      vars: {
        order_number: order.order_number,
        order_type: 'بيع USDT',
        usdt_amount: order.usdt_amount,
        lyd_amount: order.lyd_amount,
      },
      orderId: order.id,
      actionUrl: `/orders/${order.id}`,
    });

    await notifyAllAdmins({
      templateKey: 'admin_new_order',
      fallbackTitle: `طلب بيع جديد #${order.order_number}`,
      fallbackBody: `وصل طلب بيع ${order.usdt_amount} USDT (${order.lyd_amount} د.ل) عبر شبكة TRON.`,
      vars: {
        order_number: order.order_number,
        order_type: 'بيع USDT',
        usdt_amount: order.usdt_amount,
        lyd_amount: order.lyd_amount,
      },
      orderId: order.id,
      actionUrl: `/admin?tab=orders&orderId=${order.id}`,
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'تعذر إنشاء طلب البيع' },
      { status: 500 }
    );
  }
}
