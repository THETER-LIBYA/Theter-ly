import * as webpush from 'web-push';
import { db } from './db';

let cachedVapid: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    return { publicKey: envPub, privateKey: envPriv };
  }
  if (cachedVapid) return cachedVapid;

  const stored = await db.getVapidKeysFromStore();
  if (stored?.publicKey && stored?.privateKey) {
    cachedVapid = stored;
    return stored;
  }

  const generated = webpush.generateVAPIDKeys();
  await db.saveVapidKeysToStore(generated);
  cachedVapid = generated;
  return generated;
}

export function isVapidEnvConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : ''
  );
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
}): Promise<{ inAppSent: boolean; pushSentCount: number }> {
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

  if (channelPush) {
    const subs = await db.listUserPushSubscriptions(params.userId);
    if (subs.length > 0) {
      const keys = await getVapidKeys();
      const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@tetherlibya.ly';
      webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);

      const payload = JSON.stringify({
        title,
        body,
        url: params.actionUrl || '/notifications',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: params.orderId ? `order-${params.orderId}` : `notif-${Date.now()}`,
      });

      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            pushSentCount += 1;
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await db.deactivatePushSubscription(sub.endpoint);
            }
          }
        })
      );
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
      push_status: pushSentCount > 0 ? 'delivered' : channelPush ? 'no_subscription' : 'disabled',
    });
  }

  return { inAppSent: channelInApp, pushSentCount };
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
