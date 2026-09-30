import { useState, useCallback, useEffect } from 'react';
import { getVapidPublicKey, subscribeAdminPush } from '@/lib/push-campaigns.functions';
import { useAuth } from '@/lib/auth-context';

// Utility to convert Base64 VAPID key to Uint8Array
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const { session } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async (tenantId: string) => {
    if (!isSupported || !session?.user?.id) return false;
    
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        throw new Error('Permissão negada para notificações');
      }

      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const { publicKey } = await getVapidPublicKey();
      if (!publicKey) throw new Error('Chave de push indisponível.');

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey),
        });
      }

      const subData = subscription.toJSON();
      if (!subData.endpoint || !subData.keys?.p256dh || !subData.keys?.auth) {
        throw new Error('Assinatura do navegador incompleta.');
      }

      await subscribeAdminPush({
        data: {
          tenantId,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth,
          userAgent: navigator.userAgent,
        },
      });
      
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Erro ao assinar web push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, session?.user?.id]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe
  };
}
