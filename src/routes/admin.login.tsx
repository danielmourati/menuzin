import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import menuzinLogoAsset from "@/assets/menuzin-logo.png.asset.json";

const menuzinLogo = menuzinLogoAsset.url;

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function FoodLineArtBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.08] dark:opacity-[0.12] text-orange-600 dark:text-orange-400">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern id="food-lineart-pattern" width="180" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            {/* Utensils / Fork & Knife */}
            <g transform="translate(15, 15) scale(0.95)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </g>
            {/* Pizza Slice */}
            <g transform="translate(105, 20) scale(0.9)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M15 11h.01M11 15h.01M16 16h.01M2 16l10-14 10 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
            </g>
            {/* Coffee Cup */}
            <g transform="translate(20, 105) scale(0.9)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </g>
            {/* Burger */}
            <g transform="translate(110, 100) scale(0.9)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M4 11a8 8 0 0 1 16 0H4zM4 15h16M5 19h14a2 2 0 0 0 2-2v-1H3v1a2 2 0 0 0 2 2zM7 11v4M12 11v4M17 11v4" />
            </g>
            {/* Ice Cream */}
            <g transform="translate(60, 55) scale(0.85)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M7 11v2a5 5 0 0 0 10 0v-2M12 18v4M12 2a4 4 0 0 0-4 4v5h8V6a4 4 0 0 0-4-4z" />
            </g>
            {/* Cocktail / Drink */}
            <g transform="translate(140, 55) scale(0.8)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M8 22h8M12 15v7M7 2h10l1 7a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6Z" />
            </g>
            {/* Donut / Pastry */}
            <g transform="translate(15, 150) scale(0.75)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
            </g>
            {/* Chef Hat */}
            <g transform="translate(135, 145) scale(0.8)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M6 13.8a4.5 4.5 0 1 1 2.6-8.3 5 5 0 0 1 10.8 0 4.5 4.5 0 1 1 2.6 8.3V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4.2z" />
              <line x1="6" y1="18" x2="18" y2="18" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#food-lineart-pattern)" />
      </svg>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, isPlatformAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: isPlatformAdmin ? "/platform/dashboard" : "/admin/dashboard" });
    }
  }, [loading, isAuthenticated, isPlatformAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Informe o e-mail.");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) throw error;
      toast.success("Bem-vindo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-orange-50/90 via-amber-50/60 to-orange-100/40 dark:from-slate-950 dark:via-orange-950/20 dark:to-slate-900 overflow-hidden">
      {/* Background criativo com vetores de comida em line art */}
      <FoodLineArtBackground />

      {/* Efeitos visuais de iluminação em degradê no fundo */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

      {/* Card de Login principal */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-orange-200/60 bg-card/95 p-6 shadow-2xl backdrop-blur-xl dark:border-orange-900/40 sm:p-8 md:p-10">
        {/* Logo do Menuzin */}
        <div className="mb-6 flex justify-center">
          <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
            <img src={menuzinLogo} alt="Menuzin" className="h-10 w-auto drop-shadow-sm md:h-12" />
          </Link>
        </div>

        {/* Título e Subtítulo */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar no painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua loja Menuzin</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <Label htmlFor="login-email">E-mail</Label>
            <div className="relative mt-1.5">
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="login-password">Senha</Label>
            <div className="relative mt-1.5">
              <PasswordInput
                id="login-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:opacity-50"
            disabled={submitting || !email}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/admin/recuperar-senha" className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline">
            Esqueci minha senha
          </Link>
        </p>
      </div>
    </div>
  );
}
