import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const [content, paymentAccounts, platformWallets, rates, seo] = await Promise.all([
    db.getSiteContent(),
    db.listPaymentAccounts(true),
    db.listPlatformWallets(true),
    db.getExchangeRates(),
    db.listSeoSettings(),
  ]);

  // Strip internal bootstrap fields from public_pages_json if present
  const cleanPages = Object.fromEntries(
    Object.entries(content.public_pages_json || {}).filter(([k]) => !k.startsWith('__'))
  );

  return NextResponse.json({
    siteContent: {
      ...content,
      public_pages_json: cleanPages,
    },
    paymentAccounts,
    platformWallets,
    rates,
    seo,
  });
}
