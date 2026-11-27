'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const cleaned = (base64String || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function sameApplicationServerKey(
  existingKey: ArrayBuffer | null | undefined,
  expectedKey: Uint8Array
): boolean {
  if (!existingKey) return true; // Browser omitted key metadata; assume valid until push error
  const existingBytes = new Uint8Array(existingKey);
  if (existingBytes.length !== expectedKey.length) return false;
  for (let i = 0; i < existingBytes.length; i += 1) {
    if (existingBytes[i] !== expectedKey[i]) return false;
  }
  return true;
}

export interface UsePWAOptions {
  userId?: string | null;
}

export function usePWA(options?: UsePWAOptions) {
  const userId = options?.userId ?? null;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [serverSubscribedCount, setServerSubscribedCount] = useState<number>(0);
  const [syncingPush, setSyncingPush] = useState(false);

  const syncedKeyRef = useRef<string>('');

  const syncSubscriptionForActor = useCallback(
    async (reg: ServiceWorkerRegistration, activeUserId: string | null) => {
      if (!('pushManager' in reg)) return;

      try {
        const keyRes = await fetch('/api/push/vapid-key', { cache: 'no-store' });
        if (!keyRes.ok) return;
        const { publicKey } = (await keyRes.json()) as { publicKey: string };
        const expectedBytes = urlBase64ToUint8Array(publicKey);
        if (expectedBytes.length !== 65 || expectedBytes[0] !== 0x04) {
          return;
        }

        let sub = await reg.pushManager.getSubscription();
        if (sub && !sameApplicationServerKey(sub.options?.applicationServerKey, expectedBytes)) {
          await sub.unsubscribe().catch(() => false);
          sub = null;
        }

        // If the user already granted OS/browser permission and is signed in,
        // automatically register & bind their PushSubscription to the server DB.
        if (!sub && activeUserId && Notification.permission === 'granted') {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: expectedBytes.buffer,
          });
        }

        if (sub && activeUserId) {
          const syncKey = `${activeUserId}:${sub.endpoint}`;
          if (syncedKeyRef.current !== syncKey) {
            const json = sub.toJSON();
            if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
              const saveRes = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  endpoint: json.endpoint,
                  keys: json.keys,
                }),
              });
              if (saveRes.ok) {
                syncedKeyRef.current = syncKey;
                setIsPushSubscribed(true);
              } else {
                setIsPushSubscribed(false);
              }
            }
          } else {
            setIsPushSubscribed(true);
          }
        } else {
          setIsPushSubscribed(Boolean(sub && !activeUserId));
        }

        if (activeUserId) {
          const checkRes = await fetch('/api/push/subscribe', { cache: 'no-store' }).catch(() => null);
          if (checkRes && checkRes.ok) {
            const checkData = (await checkRes.json()) as { subscribedCount?: number };
            setServerSubscribedCount(checkData.subscribedCount || 0);
          }
        }
      } catch {
        // Ignore transient sync errors in unsupported frames
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    queueMicrotask(() => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);

      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
      setIsOnline(navigator.onLine);

      const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setPushSupported(hasPush);
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }
    });

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(async (reg) => {
          reg.update().catch(() => undefined);
          setSwRegistration(reg);
          if (reg.waiting) {
            setUpdateAvailable(true);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });

          const readyReg = await navigator.serviceWorker.ready;
          if (readyReg.waiting) {
            readyReg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          setSwActive(Boolean(readyReg.active));
          await syncSubscriptionForActor(readyReg, userId);
        })
        .catch(() => {
          // Ignore SW registration error in restricted frames
        });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [userId, syncSubscriptionForActor]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [swRegistration]);

  const subscribeToPush = useCallback(async () => {
    if (!pushSupported) return { ok: false, error: 'المتصفح لا يدعم إشعارات الدفع الفوري' };
    setSyncingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        return { ok: false, error: 'تم رفض صلاحية الإشعارات من إعدادات المتصفح' };
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-key', { cache: 'no-store' });
      if (!keyRes.ok) {
        return { ok: false, error: 'تعذر جلب مفتاح الإشعارات من الخادم' };
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const expectedBytes = urlBase64ToUint8Array(publicKey);
      if (expectedBytes.length !== 65 || expectedBytes[0] !== 0x04) {
        return { ok: false, error: 'مفتاح الإشعارات المستلم من الخادم غير صالح' };
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing && !sameApplicationServerKey(existing.options?.applicationServerKey, expectedBytes)) {
        await existing.unsubscribe().catch(() => false);
      }

      const subscription =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: expectedBytes.buffer,
        }));

      const json = subscription.toJSON();
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!saveRes.ok) {
        const errData = (await saveRes.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: errData.error || 'تعذر حفظ اشتراك الإشعارات' };
      }

      if (userId && json.endpoint) {
        syncedKeyRef.current = `${userId}:${json.endpoint}`;
      }
      setIsPushSubscribed(true);
      setServerSubscribedCount((c) => Math.max(1, c));
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'تعذر تفعيل الإشعارات الفورية على هذا المتصفح',
      };
    } finally {
      setSyncingPush(false);
    }
  }, [pushSupported, userId]);

  const unsubscribeFromPush = useCallback(async () => {
    const reg = swRegistration || (await navigator.serviceWorker.ready.catch(() => null));
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }
    syncedKeyRef.current = '';
    setIsPushSubscribed(false);
    setServerSubscribedCount(0);
  }, [swRegistration]);

  const sendTestPush = useCallback(async () => {
    const ensure = await subscribeToPush();
    if (!ensure.ok) {
      return {
        ok: false,
        sentCount: 0,
        swReceivedPush: false,
        localFallbackShown: false,
        error: ensure.error,
      };
    }

    let swReceivedPush = false;
    let bc: BroadcastChannel | null = null;
    const onSwMsg = (event: MessageEvent) => {
      if (event.data?.type === 'TL_PUSH_RECEIVED') {
        swReceivedPush = true;
      }
    };

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tl-notifications');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'TL_PUSH_RECEIVED') {
            swReceivedPush = true;
          }
        };
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', onSwMsg);
      }

      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        sentCount?: number;
        failedCount?: number;
        activeSubscriptions?: number;
        lastError?: string | null;
        error?: string;
      };

      window.dispatchEvent(new CustomEvent('tl:refresh-notifications'));

      if (!res.ok) {
        return {
          ok: false,
          sentCount: 0,
          swReceivedPush: false,
          localFallbackShown: false,
          error: data.error || 'فشل إرسال الإشعار التجريبي',
        };
      }

      // Wait briefly to see if FCM/APNs push delivered back to the device Service Worker
      if (data.ok && (data.sentCount || 0) > 0) {
        const deadline = Date.now() + 2400;
        while (!swReceivedPush && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      // If browser supports SW notifications and remote FCM didn't reach the tab within 2.4s,
      // trigger a local Service Worker banner check to verify OS notification permissions & channel.
      let localFallbackShown = false;
      if (!swReceivedPush && 'serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification('تيتر ليبيا — اختبار إشعار النظام', {
            body: 'صلاحية الإشعارات على جهازك تعمل! إذا لم يصلك الإشعار السحابي فتأكد من عدم حجب VPN أو DNS لخدمة الإشعارات.',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `tl-local-check-${Date.now()}`,
            renotify: true,
            dir: 'rtl',
            lang: 'ar',
            data: { url: '/notifications' },
          } as NotificationOptions);
          localFallbackShown = true;
        } catch {
          localFallbackShown = false;
        }
      }

      return {
        ok: Boolean(data.ok),
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        activeSubscriptions: data.activeSubscriptions || 0,
        lastError: data.lastError || null,
        swReceivedPush,
        localFallbackShown,
      };
    } finally {
      if (bc) bc.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMsg);
      }
    }
  }, [subscribeToPush]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isOnline,
    updateAvailable,
    pushSupported,
    pushPermission,
    isPushSubscribed,
    swActive,
    serverSubscribedCount,
    syncingPush,
    installApp,
    applyUpdate,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  };
}
