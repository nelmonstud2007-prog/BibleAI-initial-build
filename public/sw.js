// BibleAI Service Worker v2 — Offline + Push Notifications
const CACHE_VERSION = 'bibleai-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const BIBLE_CACHE = `${CACHE_VERSION}-bible`;

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => console.warn('[SW] Cache miss:', err))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('bibleai-') && ![STATIC_CACHE, API_CACHE, BIBLE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/')) return;
  if (url.hostname.includes('bible-api.com') || url.hostname.includes('api.esv.org')) {
    event.respondWith(cacheFirst(request, BIBLE_CACHE)); return;
  }
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request, API_CACHE, 5000)); return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE)); return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) { const c = await caches.open(cacheName); c.put(request, response.clone()); }
    return response;
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function networkFirst(request, cacheName, timeout = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) { const c = await caches.open(cacheName); c.put(request, response.clone()); }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((r) => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => null);
  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'BibleAI', body: event.data.text() }; }
  const options = {
    body: payload.body || 'Your daily devotional is ready.',
    icon: '/favicon-192.png', badge: '/favicon-128.png', tag: 'bibleai-daily', renotify: true,
    data: { url: payload.url || '/dashboard' },
    actions: [{ action: 'open', title: 'Open BibleAI' }, { action: 'dismiss', title: 'Dismiss' }],
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'BibleAI', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) { client.navigate(url); return client.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
