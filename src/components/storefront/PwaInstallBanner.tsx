import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Sparkles, Share, PlusSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PwaInstallBannerProps {
  tenantSlug: string;
  tenantName?: string;
}

export function PwaInstallBanner({
  tenantSlug,
  tenantName = "esta loja",
}: PwaInstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Verifica se já está rodando como PWA (standalone)
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Se o usuário já autorizou/inscreveu-se em notificações push nesta loja, não incomodar com avisos de instalação/autorização
    if (("Notification" in window) && Notification.permission === "granted") {
      return;
    }
    if (localStorage.getItem(`menuzin_push_subscribed_${tenantSlug}`)) {
      return;
    }

    // 3. Verifica se o usuário ignorou o banner recentemente (últimos 7 dias)
    const dismissedUntil = localStorage.getItem(`menuzin_pwa_dismiss_${tenantSlug}`);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 3. Detecta iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent;
    const isAppleIOS = /iPhone|iPad|iPod/i.test(userAgent);
    setIsIOS(isAppleIOS);

    if (isAppleIOS) {
      // No iOS, mostra o banner após 3 segundos
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // 4. Captura o evento nativo 'beforeinstallprompt' (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Exibe o banner após 2.5s
      setTimeout(() => setShowBanner(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [tenantSlug]);

  const handleDismiss = () => {
    setShowBanner(false);
    // Armazena recusa por 7 dias
    localStorage.setItem(
      `menuzin_pwa_dismiss_${tenantSlug}`,
      String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Caso o evento antes não tenha disparado, mas o usuário clique
      setShowIOSModal(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Erro na instalação:", err);
    }
  };

  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* Banner Superior no Topo do Catálogo */}
      <div className="fixed top-2 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[90] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card backdrop-blur-md p-3.5 shadow-2xl ring-1 ring-primary/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1 font-bold text-xs text-foreground truncate">
                <span>Instalar App {tenantName}</span>
                <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Peça mais rápido e receba cupons de desconto!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Instalar
            </Button>

            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/60 transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guia de Instalação no iOS */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Smartphone className="h-5 w-5 text-primary" /> Instalar {tenantName} no seu celular
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Siga os passos abaixo para adicionar o aplicativo na sua tela de início:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 border border-border">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-extrabold grid place-items-center shrink-0">
                1
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground flex items-center gap-1">
                  Toque em Compartilhar <Share className="h-3.5 w-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground">
                  No Safari ou Chrome no seu celular, toque no ícone de compartilhamento na barra do navegador.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 border border-border">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-extrabold grid place-items-center shrink-0">
                2
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground flex items-center gap-1">
                  Adicionar à Tela de Início <PlusSquare className="h-3.5 w-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground">
                  Role o menu de opções para baixo e selecione a opção <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 border border-border">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-extrabold grid place-items-center shrink-0">
                3
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Pronto! Abra o App no seu celular</p>
                <p className="text-muted-foreground">
                  O ícone do restaurante aparecerá na sua tela inicial como um aplicativo nativo!
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowIOSModal(false)} className="w-full font-bold">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
