import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getVapidPublicKey, subscribeCustomerPush } from "@/lib/push-campaigns.functions";

interface PushPermissionBannerProps {
  tenantSlug: string;
  tenantName?: string;
  customerPhone?: string | null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPermissionBanner({
  tenantSlug,
  tenantName = "esta loja",
  customerPhone,
}: PushPermissionBannerProps) {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Verifica se o navegador suporta Web Push
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") return; // Já inscrito/permitido
    if (Notification.permission === "denied") return; // Bloqueado pelo usuário

    const dismissedUntil = localStorage.getItem(`menuzin_push_dismiss_${tenantSlug}`);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // Mostra o banner após 3.5 segundos de navegação
    const timer = setTimeout(() => setShow(true), 3500);
    return () => clearTimeout(timer);
  }, [tenantSlug]);

  const handleDismiss = () => {
    setShow(false);
    // Não incomoda o cliente pelos próximos 14 dias
    localStorage.setItem(`menuzin_push_dismiss_${tenantSlug}`, String(Date.now() + 14 * 24 * 60 * 60 * 1000));
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      // 1. Solicita permissão do navegador
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão de notificações não concedida.");
        setShow(false);
        return;
      }

      // 2. Registra o Service Worker do Push se ainda não registrado
      const reg = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 3. Obtém a chave pública VAPID
      const { publicKey } = await getVapidPublicKey();
      if (!publicKey) throw new Error("Chave de push indisponível.");

      // 4. Cria a assinatura no navegador via PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const jsonSub = sub.toJSON();
      if (!jsonSub.endpoint || !jsonSub.keys?.p256dh || !jsonSub.keys?.auth) {
        throw new Error("Assinatura do navegador incompleta.");
      }

      // 5. Envia a assinatura para o servidor da loja
      await subscribeCustomerPush({
        data: {
          tenantSlug,
          endpoint: jsonSub.endpoint,
          p256dh: jsonSub.keys.p256dh,
          auth: jsonSub.keys.auth,
          customerPhone: customerPhone || null,
          userAgent: navigator.userAgent,
        },
      });

      setSubscribed(true);
      toast.success(`Notificações ativadas! Você receberá os cupons e promoções de ${tenantName}.`);
      setTimeout(() => setShow(false), 2500);
    } catch (err: any) {
      console.error("[PushSubscribe] Erro:", err);
      toast.error(err.message || "Não foi possível ativar as notificações.");
    } finally {
      setSubscribing(false);
    }
  };

  const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleSubscribeClick = () => {
    if (isIOS && !window.matchMedia("(display-mode: standalone)").matches) {
      setShowIOSGuide(true);
      return;
    }
    handleSubscribe();
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md p-4 shadow-2xl ring-1 ring-primary/20">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {showIOSGuide ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>Como ativar no iPhone (iOS):</span>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-2 text-foreground">
              <p className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] grid place-items-center">1</span>
                <span>Toque no botão <strong>Compartilhar 📤</strong> no Safari.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] grid place-items-center">2</span>
                <span>Selecione <strong>&quot;Adicionar à Tela de Início&quot; ➕</strong>.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] grid place-items-center">3</span>
                <span>Abra a loja pelo ícone criado na tela de início!</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button size="sm" variant="outline" onClick={() => setShowIOSGuide(false)} className="h-8 text-xs font-medium">
                Entendi
              </Button>
            </div>
          </div>
        ) : subscribed ? (
          <div className="flex items-center gap-3 py-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-foreground">Notificações Ativas!</h4>
              <p className="text-xs text-muted-foreground">Você receberá ofertas e cupons exclusivos no seu dispositivo.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <Bell className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-foreground">Receber Cupons & Ofertas?</span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ative os avisos de <strong>{tenantName}</strong> para não perder cupons de desconto e promoções imperdíveis.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                Agora não
              </Button>
              <Button
                size="sm"
                onClick={handleSubscribeClick}
                disabled={subscribing}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5 shadow-xs"
              >
                <Bell className="h-3.5 w-3.5" />
                {subscribing ? "Ativando..." : "Quero Receber Descontos"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
