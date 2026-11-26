import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyAllAdmins } from '@/lib/push';
import { checkRateLimit, getClientIp, verifyOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`contact-ip:${ip}`, 6, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `تم إرسال عدة رسائل مؤخراً، يرجى الانتظار ${limit.retryAfterSec} ثانية` },
      { status: 429 }
    );
  }

  const body = (await req.json()) as {
    name?: string;
    phone?: string;
    subject?: string;
    message?: string;
  };

  if (!body.name?.trim() || !body.phone?.trim() || !body.message?.trim()) {
    return NextResponse.json(
      { error: 'يرجى تعبئة الاسم ورقم الهاتف ونص الرسالة' },
      { status: 400 }
    );
  }

  const ticket = await db.createSupportMessage({
    name: body.name.trim().slice(0, 80),
    phone: body.phone.trim().slice(0, 30),
    subject: (body.subject?.trim() || 'استفسار عام').slice(0, 120),
    message: body.message.trim().slice(0, 2000),
  });

  await notifyAllAdmins({
    fallbackTitle: `رسالة دعم فني جديدة: ${ticket.subject}`,
    fallbackBody: `من: ${ticket.name} (${ticket.phone}) — ${ticket.message.slice(0, 160)}`,
    actionUrl: '/admin?tab=support',
  });

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
