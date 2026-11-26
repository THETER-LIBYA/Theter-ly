import { db } from './db';
import { ExchangeRates } from './types';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Fetches live parallel-market USD/LYD rate from the internal live feed endpoint
 * (https://api.prices.ly/api/prices/today).
 * Falls back gracefully to stored base rate if network is unavailable.
 */
export async function fetchLivePricesLyUsdRate(): Promise<{
  ok: boolean;
  rate: number | null;
  provider: string;
}> {
  const endpoints = [
    'https://api.prices.ly/api/prices/today',
    'https://prices.ly/api/prices/today',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TetherLibya/1.0)',
          Accept: 'application/json',
          Origin: 'https://prices.ly',
          Referer: 'https://prices.ly/',
        },
        signal: AbortSignal.timeout(7000),
        cache: 'no-store',
      });
      if (!res.ok) continue;

      const text = await res.text();
      if (!text.trim().startsWith('{')) continue;

      const json = JSON.parse(text) as {
        message?: string;
        data?: {
          usd_tripoli?: number;
          usd_benghazi?: number;
          [key: string]: unknown;
        };
      };

      const rawTripoli = Number(json?.data?.usd_tripoli);
      if (Number.isFinite(rawTripoli) && rawTripoli >= 4 && rawTripoli <= 30) {
        return { ok: true, rate: round3(rawTripoli), provider: 'Prices.ly' };
      }

      const rawBenghazi = Number(json?.data?.usd_benghazi);
      if (Number.isFinite(rawBenghazi) && rawBenghazi >= 4 && rawBenghazi <= 30) {
        return { ok: true, rate: round3(rawBenghazi), provider: 'Prices.ly' };
      }
    } catch {
      // Try next endpoint
    }
  }

  return { ok: false, rate: null, provider: 'Prices.ly' };
}

export async function getOrRefreshRates(forceRefresh = false): Promise<{
  rates: ExchangeRates;
  syncedFromPricesLy: boolean;
}> {
  const current = await db.getExchangeRates();
  const lastFetchedMs = new Date(current.last_fetched_at).getTime();
  const ageMs = Number.isFinite(lastFetchedMs) ? Date.now() - lastFetchedMs : Number.MAX_SAFE_INTEGER;
  const isNeverSynced = !Number.isFinite(lastFetchedMs) || lastFetchedMs < 1000000;

  const shouldSync =
    current.auto_update_enabled &&
    current.source === 'prices_ly' &&
    (forceRefresh || isNeverSynced || ageMs > 1000 * 60 * 5);

  if (!shouldSync) {
    return { rates: current, syncedFromPricesLy: false };
  }

  const live = await fetchLivePricesLyUsdRate();
  const now = new Date().toISOString();

  if (live.ok && live.rate) {
    const buyRate = round3(live.rate + Number(current.buy_margin));
    const sellRate = round3(live.rate + Number(current.sell_margin));
    const updated = await db.updateExchangeRates({
      base_usd_lyd: live.rate,
      buy_rate: Math.max(0.1, buyRate),
      sell_rate: Math.max(0.1, sellRate),
      last_fetched_at: now,
    });
    return { rates: updated, syncedFromPricesLy: true };
  }

  if (forceRefresh) {
    const updated = await db.updateExchangeRates({
      last_fetched_at: now,
    });
    return { rates: updated, syncedFromPricesLy: false };
  }

  return { rates: current, syncedFromPricesLy: false };
}
