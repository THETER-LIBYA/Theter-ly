import * as webpush from 'web-push';
import { db } from './db';

let cachedVapid: { publicKey: string; privateKey: string } | null = null;
let pendingVapidPromise: Promise<{ publicKey: string; privateKey: string }> | null = null;

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    return { publicKey: envPub, privateKey: envPriv };
  }
  if (cachedVapid) return cachedVapid;

  if (!pendingVapidPromise) {
    pendingVapidPromise = (async () => {
      const stored = await db.getVapidKeysFromStore();
      if (stored?.publicKey && stored?.privateKey) {
        cachedVapid = stored;
        return stored;
      }

      const generated = webpush.generateVAPIDKeys();
      await db.saveVapidKeysToStore(generated);
      cachedVapid = generated;
      return generated;
    })().finally(() => {
      pendingVapidPromise = null;
    });
  }

  return pendingVapidPromise;
}

export function isVapidEnvConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : ''
  );
}

async function deliverPushToUser(
  userId: string,
  payloadInput: {
    title: string;
    body: string;
    url: string;
    tag: string;
  }
): Promise<{ sentCount: number; failedCount: number; activeSubscriptions: number; lastError: string | null }> {
  const subs = await db.listUserPushSubscriptions(userId);
  if (subs.length === 0) {
    return { sentCount: 0, failedCount: 0, activeSubscriptions: 0, lastError: null };
  }

  const [keys, siteContent] = await Promise.all([
    getVapidKeys(),
    db.getSiteContent().catch(() => null),
  ]);
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@tetherlibya.ly';
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);

  const iconUrl = siteContent?.icon_192_url || '/pwa-192x192.png';
  const payload = JSON.stringify({
    title: payloadInput.title,
    body: payloadInput.body,
    url: payloadInput.url,
    icon: iconUrl,
    badge: '/pwa-192x192.png',
    tag: payloadInput.tag,
  });

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          {
            TTL: 86400,
            urgency: 'high',
          }
        );
        sentCount += 1;
      } catch (err: unknown) {
        failedCount += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        const bodyText = (err as { body?: string; message?: string })?.body ||
          (err as { message?: string })?.message ||
          'push_failed';
        lastError = statusCode ? `HTTP ${statusCode}: ${bodyText}` : String(bodyText);

        // Deactivate expired, unsubscribed, or VAPID-key-mismatched endpoints
        if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 410) {
          await db.deactivatePushSubscription(sub.endpoint);
        }
      }
    })
  );

  return {
    sentCount,
    failedCount,
    activeSubscriptions: subs.length,
    lastError,
  };
}

export async function dispatchNotification(params: {
  userId: string;
  templateKey?: string;
  type: 'order_updates' | 'rate_alerts' | 'promotions' | 'admin_alerts';
  fallbackTitle: string;
  fallbackBody: string;
  vars?: Record<string, string | number>;
  orderId?: string | null;
  actionUrl?: string | null;
}): Promise<{ inAppSent: boolean; pushSentCount: number; pushFailedCount?: number; lastError?: string | null }> {
  const prefs = await db.getUserNotificationPreferences(params.userId);
  if (params.type === 'order_updates' && !prefs.order_updates) return { inAppSent: false, pushSentCount: 0 };
  if (params.type === 'rate_alerts' && !prefs.rate_alerts) return { inAppSent: false, pushSentCount: 0 };
  if (params.type === 'promotions' && !prefs.promotions) return { inAppSent: false, pushSentCount: 0 };
  if (params.type === 'admin_alerts' && !prefs.admin_alerts) return { inAppSent: false, pushSentCount: 0 };

  let title = params.fallbackTitle;
  let body = params.fallbackBody;
  let channelInApp = true;
  let channelPush = true;

  if (params.templateKey) {
    const templates = await db.listNotificationTemplates();
    const tpl = templates.find((t) => t.key === params.templateKey);
    if (tpl) {
      if (!tpl.is_enabled) return { inAppSent: false, pushSentCount: 0 };
      title = interpolate(tpl.title_template, params.vars || {});
      body = interpolate(tpl.body_template, params.vars || {});
      channelInApp = tpl.channel_in_app;
      channelPush = tpl.channel_push;
    }
  }

  let pushSentCount = 0;
  let pushFailedCount = 0;
  let pushStatus = channelPush ? 'no_subscription' : 'disabled';
  let lastError: string | null = null;

  if (channelPush) {
    const delivery = await deliverPushToUser(params.userId, {
      title,
      body,
      url: params.actionUrl || '/notifications',
      tag: params.orderId ? `order-${params.orderId}` : `notif-${Date.now()}`,
    });
    pushSentCount = delivery.sentCount;
    pushFailedCount = delivery.failedCount;
    lastError = delivery.lastError;
    if (pushSentCount > 0) {
      pushStatus = 'delivered';
    } else if (delivery.activeSubscriptions > 0) {
      pushStatus = delivery.lastError ? `failed:${delivery.lastError.slice(0, 60)}` : 'failed';
    }
  }

  if (channelInApp) {
    await db.createNotification({
      user_id: params.userId,
      order_id: params.orderId || null,
      type: params.type,
      title,
      body,
      action_url: params.actionUrl || null,
      push_status: pushStatus,
    });
  }

  return { inAppSent: channelInApp, pushSentCount, pushFailedCount, lastError };
}

export async function sendWebPushTest(userId: string) {
  const siteContent = await db.getSiteContent().catch(() => null);
  const appName = siteContent?.app_name_ar || 'تيتر ليبيا';
  return deliverPushToUser(userId, {
    title: `${appName} — إشعار تجريبي مباشر`,
    body: 'تصل الإشعارات الخارجية على جهازك بنجاح حتى عند إغلاق التطبيق.',
    url: '/notifications',
    tag: `tl-test-${Date.now()}`,
  });
}

export async function notifyAllAdmins(params: {
  templateKey?: string;
  fallbackTitle: string;
  fallbackBody: string;
  vars?: Record<string, string | number>;
  orderId?: string | null;
  actionUrl?: string | null;
}) {
  const admins = await db.listAdmins();
  await Promise.all(
    admins.map((admin) =>
      dispatchNotification({
        userId: admin.id,
        templateKey: params.templateKey,
        type: 'admin_alerts',
        fallbackTitle: params.fallbackTitle,
        fallbackBody: params.fallbackBody,
        vars: params.vars,
        orderId: params.orderId,
        actionUrl: params.actionUrl || '/admin',
      })
    )
  );
}
