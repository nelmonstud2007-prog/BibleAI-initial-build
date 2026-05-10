// BibleAI Service Worker - Web Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BibleAI', body: event.data.text() };
  }
  const options = {
    body: payload.body || 'Your daily devotional is ready.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: 'bibleai-daily',
    renotify: true,
    data: { url: payload.url || '/dashboard' },
    actions: [
      { action: 'open', title: 'Open BibleAI' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'BibleAI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
