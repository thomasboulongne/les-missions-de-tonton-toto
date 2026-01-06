// Custom service worker for push notifications
// This file is imported by vite-plugin-pwa

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const title = data.title || 'Tonton Toto';
  const options = {
    body: data.body || 'Tu as un nouveau message !',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Voir',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

