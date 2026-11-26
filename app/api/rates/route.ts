import { NextRequest, NextResponse } from 'next/server';
import { getOrRefreshRates } from '@/lib/prices';

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const { rates, syncedFromPricesLy } = await getOrRefreshRates(force);

  return NextResponse.json({
    rates: {
      ...rates,
      source: rates.source === 'manual' ? 'manual' : 'market',
    },
    synced: syncedFromPricesLy,
  });
}
