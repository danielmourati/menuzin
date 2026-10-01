import { useState, useCallback, useEffect } from 'react';
import { getVapidPublicKey, subscribeAdminPush } from '@/lib/push-campaigns.functions';
import { toast } from 'sonner';
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

export function getPushSupport(): { ok: boolean; reason: string } {
  if (typeof window === 'undefined') return { ok: false, reason: '' };
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  let inIframe = false;
  try { inIframe = window.top !== window.self; } catch { inIframe = true; }
  if (inIframe) return { ok: false, reason: 'Não funciona dentro da prévia. Abra o site publicado (menuzin.app).' };
  if (isIOS && !standalone) return { ok: false, reason: 'No iPhone: toque em Compartilhar > Adicionar à Tela de Início e abra o Menuzin por lá (iOS 16.4 ou mais novo).' };
  if (!window.isSecureContext) return { ok: false, reason: 'Só funciona em endereço seguro (https).' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'Este navegador não tem avisos em segundo plano (pode ser modo anônimo). Use o Chrome, Edge ou Firefox.' };
  }
  return { ok: true, reason: '' };
}

export function useWebPush() {
  const { session } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState('');

  useEffect(() => {
    const support = getPushSupport();
    setUnsupportedReason(support.reason);
    if (support.ok) {
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
        toast.error('Permissão negada. Libere as notificações do site nas configurações do navegador.');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const { publicKey: vapidPublicKey } = await getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error('O servidor está sem a chave de notificações. Fale com o suporte.');
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
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
      toast.error('Não foi possível ativar: ' + ((err as Error)?.message || 'erro desconhecido'));
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
    unsupportedReason,
    subscribe
  };
}
