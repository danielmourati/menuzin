import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Pegar a chave VAPID das variáveis de ambiente
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Chave VAPID pública não configurada (VITE_VAPID_PUBLIC_KEY)');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
      });

      const subData = JSON.parse(JSON.stringify(subscription));

      // Salvar no Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        tenant_id: tenantId,
        user_id: session.user.id,
        is_admin_device: true,
        endpoint: subData.endpoint,
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth,
        user_agent: navigator.userAgent,
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (error) throw error;
      
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
