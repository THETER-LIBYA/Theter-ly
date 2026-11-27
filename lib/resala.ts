import crypto from 'crypto';

const RESALA_BASE_URL = 'https://dev.resala.ly/api/v1';

export type ResalaErrorType =
  | 'AccountExpired'
  | 'InsufficientCredit'
  | 'BadRequest'
  | 'Unauthorized'
  | 'TokenExpired'
  | 'Forbidden'
  | 'NotFound'
  | 'InputValidation'
  | string;

export function isResalaConfigured(): boolean {
  return Boolean(process.env.RESALA_API_TOKEN && process.env.RESALA_API_TOKEN.trim().length > 5);
}

export interface ResalaPinResponse {
  ok: boolean;
  pin: string;
  reference: string | null;
  senderName?: string | null;
  mode: 'resala_live' | 'preview_fallback';
  error?: string;
  errorType?: ResalaErrorType;
  requestId?: string | null;
}

export async function sendResalaPin(phone: string): Promise<ResalaPinResponse> {
  const token = process.env.RESALA_API_TOKEN?.trim();
  const serviceName = process.env.RESALA_SERVICE_NAME?.trim() || 'Tether Libya';
  const sender = process.env.RESALA_SENDER_ID?.trim();
  const isTestMode = process.env.RESALA_TEST_MODE === 'true';

  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        pin: '',
        reference: null,
        mode: 'resala_live',
        errorType: 'NotConfigured',
        error: 'بوابة الرسائل النصية غير مهيأة في متغيرات البيئة',
      };
    }
    // Non-production local development fallback when RESALA_API_TOKEN is unset
    const pin = String(crypto.randomInt(100000, 999999));
    return {
      ok: true,
      pin,
      reference: `local-${Date.now()}`,
      mode: 'preview_fallback',
    };
  }

  try {
    const params = new URLSearchParams({
      service_name: serviceName,
      len: '6',
    });
    if (sender) params.set('sender', sender);
    if (isTestMode) params.set('test', 'true');

    const res = await fetch(`${RESALA_BASE_URL}/pins?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errorType = typeof data.type === 'string' ? data.type : undefined;
      const requestId = typeof data.request_id === 'string' ? data.request_id : null;
      console.error('[SMS OTP Error]', {
        httpStatus: res.status,
        type: errorType,
        request_id: requestId,
        message: data.message || data.error,
      });
      return {
        ok: false,
        pin: '',
        reference: null,
        mode: 'resala_live',
        errorType,
        requestId,
        error: String(data.message || data.error || `HTTP ${res.status}`),
      };
    }

    // Per Resala /pins 201 schema: data.pin is the OTP and data.code is the dialing code ("218")
    const nested = (data.data || {}) as Record<string, unknown>;
    const rawPin = data.pin ?? nested.pin;
    const returnedPin = typeof rawPin === 'string' || typeof rawPin === 'number' ? String(rawPin).trim() : '';
    const reference = String(data.id || nested.id || '');
    const senderName = typeof data.sender_name === 'string' ? data.sender_name : null;

    if (!/^\d{4,6}$/.test(returnedPin)) {
      return {
        ok: false,
        pin: '',
        reference: reference || null,
        mode: 'resala_live',
        error: 'Invalid PIN payload returned from SMS provider',
      };
    }

    return {
      ok: true,
      pin: returnedPin,
      reference: reference || null,
      senderName,
      mode: 'resala_live',
    };
  } catch (err) {
    return {
      ok: false,
      pin: '',
      reference: null,
      mode: 'resala_live',
      error: err instanceof Error ? err.message : 'SMS request timeout or network error',
    };
  }
}

export async function sendResalaTemplateMessage(
  templateId: string,
  records: Array<Record<string, string>>,
  options?: { scheduledAt?: string }
): Promise<{
  ok: boolean;
  succeeded?: number;
  failed?: number;
  invalidNumbers?: string[];
  errorType?: ResalaErrorType;
  requestId?: string | null;
  error?: string;
}> {
  const token = process.env.RESALA_API_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: 'RESALA_API_TOKEN not configured' };
  }
  try {
    const params = new URLSearchParams({ sms_template_id: templateId });
    const sender = process.env.RESALA_SENDER_ID?.trim();
    if (sender) params.set('sender', sender);
    if (process.env.RESALA_TEST_MODE === 'true') params.set('test', 'true');
    if (options?.scheduledAt) params.set('scheduled_at', options.scheduledAt);

    const res = await fetch(`${RESALA_BASE_URL}/messages/send-template?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ records }),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errorType = typeof data.type === 'string' ? data.type : undefined;
      const requestId = typeof data.request_id === 'string' ? data.request_id : null;
      console.error('[SMS Template Error]', {
        httpStatus: res.status,
        type: errorType,
        request_id: requestId,
        message: data.message,
      });
      return {
        ok: false,
        errorType,
        requestId,
        error: String(data.message || `HTTP ${res.status}`),
      };
    }

    return {
      ok: true,
      succeeded: typeof data.succeeded === 'number' ? data.succeeded : undefined,
      failed: typeof data.failed === 'number' ? data.failed : undefined,
      invalidNumbers: Array.isArray(data.invalid_numbers) ? (data.invalid_numbers as string[]) : [],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMS send error' };
  }
}
