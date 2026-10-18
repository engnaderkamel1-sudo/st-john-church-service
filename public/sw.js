// Service Worker for St. John Church Servants Prep PWA
// Provides background Web Push Notifications & notification click routing

const CACHE_NAME = 'st-john-sw-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for Background Push Messages from OS / Push Server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'إشعار من خدمة إعداد الخدام ⛪',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'إشعار جديد ⛪';
  const options = {
    body: data.body || '',
    icon: data.icon || '/church_logo.jpg',
    badge: data.badge || '/church_logo.jpg',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    },
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: true,
    tag: data.tag || 'st-john-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle click on notification (open or focus window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
