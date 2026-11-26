import crypto from 'crypto';
import { NextRequest } from 'next/server';

const globalForSecret = globalThis as unknown as { __tetherSessionSecret?: string };

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  if (!globalForSecret.__tetherSessionSecret) {
    globalForSecret.__tetherSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalForSecret.__tetherSessionSecret;
}

export function hashToken(token: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(token)
    .digest('hex');
}

export function hashOtp(phone: string, pin: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(`${phone}:${pin}`)
    .digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizeLibyanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (/^2189[1-4]\d{7}$/.test(digits)) return digits;
  if (/^09[1-4]\d{7}$/.test(digits)) return `218${digits.slice(1)}`;
  if (/^9[1-4]\d{7}$/.test(digits)) return `218${digits}`;
  return null;
}

export function isValidTronAddress(addr: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr.trim());
}

export function isValidTxHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash.trim());
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function verifyOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') return false;

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const origin = req.headers.get('origin');
  if (origin) {
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get('referer');
  if (referer && host) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return true;
}

const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key) || [];
  const valid = existing.filter((ts) => now - ts < windowMs);
  if (valid.length >= maxRequests) {
    const oldest = valid[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitStore.set(key, valid);
    return { allowed: false, retryAfterSec };
  }
  valid.push(now);
  rateLimitStore.set(key, valid);
  if (rateLimitStore.size > 2000) {
    for (const [k, list] of rateLimitStore.entries()) {
      if (list.every((ts) => now - ts >= windowMs)) rateLimitStore.delete(k);
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function validateFileMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }
  return false;
}

export const SESSION_COOKIE_NAME = 'tl_session';
export const ADMIN_COOKIE_NAME = 'tl_admin_session';
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 4; // 4 days persistent sliding session

export function buildCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    partitioned: true,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
