self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || 'Menuzin';
      const options = {
        body: data.body || 'Novo pedido recebido!',
        icon: data.icon || '/icon-192x192.png',
        badge: '/badge.png',
        data: data.url || '/admin/pedidos',
        requireInteraction: true, // Garante que a notificação fique na tela até o usuário clicar
        vibrate: [200, 100, 200, 100, 200, 100, 200]
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('Erro ao processar notificação push', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Ao clicar, tenta focar na aba existente ou abrir uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      const targetUrl = event.notification.data || '/admin/pedidos';
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
