/* Service Worker para Web Push Notifications — Menuzin Delivery */

self.addEventListener('push', function (event) {
  if (!event.data) {
    return; // Ignora pushes vazios (pings do navegador)
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    return; // Ignora se não for JSON (não é campanha disparada pelo sistema)
  }

  const title = data.title || 'Novidade na loja! 🛵';
  const options = {
    body: data.body || 'Confira as promoções e cupons do dia.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || null,
    tag: 'menuzin-campaign-' + Date.now(),
    renotify: true,
    data: {
      url: data.url || '/',
      coupon: data.coupon || null,
    },
    vibrate: [200, 100, 200],
    actions: data.coupon ? [
      { action: 'open_store', title: '🏷️ Ver Cupom' },
      { action: 'close', title: 'Fechar' }
    ] : [
      { action: 'open_store', title: '🛍️ Abrir Loja' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
