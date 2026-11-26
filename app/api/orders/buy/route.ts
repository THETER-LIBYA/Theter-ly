import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { dispatchNotification, notifyAllAdmins } from '@/lib/push';
import { isValidTronAddress, sanitizeUrl, verifyOrigin } from '@/lib/security';

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
      paymentMethod?: 'lypay' | 'onepay' | 'bank_transfer';
      bankAccountId?: string;
      senderName?: string;
      senderBank?: string;
      transferReference?: string;
      receiptUrl?: string;
      customerWalletAddress?: string;
      network?: string;
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
    if (!rates.buy_enabled) {
      return NextResponse.json(
        { error: 'خدمة شراء USDT متوقفة مؤقتاً من قبل الإدارة' },
        { status: 403 }
      );
    }

    const usdtAmount = Number(body.usdtAmount);
    if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ USDT غير صالح' }, { status: 400 });
    }
    if (usdtAmount < rates.min_order_usdt || usdtAmount > rates.max_order_usdt) {
      return NextResponse.json(
        {
          error: `الحد المسموح للشراء بين ${rates.min_order_usdt} و ${rates.max_order_usdt} USDT`,
        },
        { status: 400 }
      );
    }

    const paymentMethod = body.paymentMethod;
    if (!paymentMethod || !['lypay', 'onepay', 'bank_transfer'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'يرجى اختيار وسيلة دفع صالحة (LYPay أو OnePay)' }, { status: 400 });
    }

    const accounts = await db.listPaymentAccounts(true);
    const bankAccount =
      accounts.find((a) => a.id === body.bankAccountId && a.method === paymentMethod) ||
      accounts.find((a) => a.method === paymentMethod);
    if (!bankAccount) {
      return NextResponse.json({ error: 'وسيلة الدفع المختارة غير متاحة حالياً' }, { status: 400 });
    }

    const senderName = (body.senderName || '').trim();
    const senderBank = (body.senderBank || '').trim();
    const transferReference = (body.transferReference || '').trim();
    const receiptUrl = sanitizeUrl(body.receiptUrl);
    const walletAddress = (body.customerWalletAddress || '').trim();
    const network = (body.network || 'TRC20').trim().toUpperCase();

    if (senderName.length < 3 || senderBank.length < 2 || transferReference.length < 3) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المحوّل والمصرف ورقم التحويل بشكل صحيح' },
        { status: 400 }
      );
    }
    if (!receiptUrl) {
      return NextResponse.json({ error: 'يرجى رفع إيصال الدفع' }, { status: 400 });
    }
    if (!isValidTronAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'عنوان محفظة TRON (TRC20) غير صالح — يجب أن يبدأ بحرف T ويتكون من 34 خانة' },
        { status: 400 }
      );
    }
    if (network !== 'TRC20') {
      return NextResponse.json({ error: 'الشبكة المدعومة حالياً هي TRON (TRC20) فقط' }, { status: 400 });
    }

    const idempotencyKey = (body.idempotencyKey || '').trim() || `buy-${user.id}-${transferReference}-${usdtAmount}`;
    const existing = await db.getOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      return NextResponse.json({ ok: true, order: existing, deduplicated: true });
    }

    // Server-authoritative LYD calculation
    const rateApplied = Number(rates.buy_rate);
    const lydAmount = Math.round(usdtAmount * rateApplied * 1000) / 1000;

    const order = await db.createOrder({
      idempotency_key: idempotencyKey,
      user_id: user.id,
      type: 'buy',
      usdt_amount: usdtAmount,
      rate_applied: rateApplied,
      lyd_amount: lydAmount,
      payment_method: paymentMethod,
      bank_account_id: bankAccount.id,
      platform_wallet_id: null,
      sender_name: senderName,
      sender_bank: senderBank,
      transfer_reference: transferReference,
      receipt_url: receiptUrl,
      customer_wallet_address: walletAddress,
      network: 'TRC20',
      tx_hash: null,
      recipient_full_name: null,
      recipient_bank: null,
      recipient_account_number: null,
      recipient_iban: null,
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
      fallbackTitle: `تم استلام طلب الشراء #${order.order_number}`,
      fallbackBody: `طلب شراء ${order.usdt_amount} USDT بقيمة ${order.lyd_amount} د.ل قيد المراجعة الإدارية.`,
      vars: {
        order_number: order.order_number,
        order_type: 'شراء USDT',
        usdt_amount: order.usdt_amount,
        lyd_amount: order.lyd_amount,
      },
      orderId: order.id,
      actionUrl: `/orders/${order.id}`,
    });

    await notifyAllAdmins({
      templateKey: 'admin_new_order',
      fallbackTitle: `طلب شراء جديد #${order.order_number}`,
      fallbackBody: `طلب شراء ${order.usdt_amount} USDT (${order.lyd_amount} د.ل) عبر ${paymentMethod.toUpperCase()}.`,
      vars: {
        order_number: order.order_number,
        order_type: 'شراء USDT',
        usdt_amount: order.usdt_amount,
        lyd_amount: order.lyd_amount,
      },
      orderId: order.id,
      actionUrl: `/admin?tab=orders&orderId=${order.id}`,
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'تعذر إنشاء طلب الشراء' },
      { status: 500 }
    );
  }
}
