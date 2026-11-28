const SW_VERSION = 'zp-sw-v2.0.0';
const STATIC_CACHE = `zarnixpay-static-${SW_VERSION}`;
const STATIC_ASSETS = [
  '/offline',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/images/brand-icon.png',
  '/images/promo-banner.jpg',
];

const PRIVATE_PREFIXES = ['/api', '/admin', '/orders', '/buy', '/sell', '/account', '/login', '/notifications', '/_next'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => (key.startsWith('zarnixpay-') || key.startsWith('tether-libya-')) && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private financial pages, API endpoints, or Next.js build/dev chunks
  if (PRIVATE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  // Navigation requests: Network-first with /offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOffline = await caches.match('/offline');
        return cachedOffline || Response.error();
      })
    );
    return;
  }

  // Static public images/icons only: Stale-while-revalidate
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

async function resolveSafeIconUrl(candidate) {
  if (!candidate || candidate === '/pwa-192x192.png') {
    return '/pwa-192x192.png';
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(candidate, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return candidate;
  } catch {
    // Fall back to pre-cached static icon
  }
  return '/pwa-192x192.png';
}

// Web Push Notifications Handler (System-level heads-up / lock-screen alerts + open window sync)
self.addEventListener('push', (event) => {
  let data = {
    title: 'ZarnixPay',
    body: 'لديك تحديث جديد في حسابك',
    url: '/notifications',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `zp-notif-${Date.now()}`,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  event.waitUntil(
    (async () => {
      const safeIcon = await resolveSafeIconUrl(data.icon);

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: safeIcon,
        badge: '/pwa-192x192.png',
        tag: data.tag || `tl-notif-${Date.now()}`,
        renotify: true,
        vibrate: [250, 100, 250],
        timestamp: Date.now(),
        silent: false,
        dir: 'rtl',
        lang: 'ar',
        data: { url: data.url || '/notifications' },
      });

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('tl-notifications');
          bc.postMessage({ type: 'TL_PUSH_RECEIVED', notification: data });
          bc.close();
        }
      } catch {
        // Ignore BroadcastChannel errors
      }

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        client.postMessage({ type: 'TL_PUSH_RECEIVED', notification: data });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => undefined);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
