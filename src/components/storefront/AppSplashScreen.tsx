import { useEffect, useState } from "react";

export function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detecta se o app foi aberto em modo PWA instalado no celular/PC (display-mode: standalone/fullscreen) ou parâmetro ?splash=1
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://") ||
      window.location.search.includes("splash=1");

    if (isStandalone) {
      setIsVisible(true);

      // Inicia a transição fluida de saída (fade out + zoom scale) após 1.7s
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1700);

      // Desmonta totalmente a overlay da memória
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 2400);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-[#F97316] via-[#EA5B1E] to-[#C2410C] text-white select-none transition-all duration-700 ease-out ${
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Halo de Luz Ambiente e Padrão de Fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] bg-white/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 space-y-6">
        {/* Glow Ring Animado Atrás do Logotipo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-36 h-36 bg-white/25 rounded-3xl blur-xl animate-ping duration-1000" />

          {/* Container do Logotipo com fundo translúcido e borda em vidro */}
          <div className="relative h-28 w-28 rounded-3xl bg-white/10 backdrop-blur-md border border-white/30 p-5 shadow-2xl flex items-center justify-center animate-splash-pop">
            <img
              src="/icon-512.png"
              alt="Menuzin"
              className="h-full w-full object-contain filter brightness-0 invert transition-transform duration-500 hover:scale-110"
            />
          </div>
        </div>

        {/* Tipografia da Marca em Branco Puro */}
        <div className="space-y-1.5 animate-splash-text">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md font-sans">
            Menuzin
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-white/90 tracking-wider uppercase">
            Seu Cardápio & Delivery Digital
          </p>
        </div>

        {/* Barra de Carregamento Fluida em Branco */}
        <div className="pt-6 flex flex-col items-center gap-2">
          <div className="w-32 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full animate-splash-progress" />
          </div>
          <span className="text-[11px] font-medium text-white/80 tracking-wide">
            Abastecendo seu catálogo...
          </span>
        </div>
      </div>
    </div>
  );
}
