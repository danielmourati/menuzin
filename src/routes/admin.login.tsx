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

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="grid min-h-screen bg-white lg:grid-cols-2 lg:bg-background">
      <div className="relative hidden gradient-brand lg:flex lg:flex-col lg:justify-between p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 text-white">
          <div className="rounded-xl bg-white/95 px-3 py-1.5 shadow">
            <img src="/__l5e/assets-v1/8bccd988-a267-40f1-ae97-10934cea3aac/menuzin-logo.png" alt="Menuzin" className="h-7 w-auto" />
          </div>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight text-balance">
            Receba pedidos no WhatsApp e organize tudo em um só lugar.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/85">
            Painel completo para gerenciar produtos, categorias, pedidos e a aparência da sua loja.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© Menuzin</p>
      </div>
      <div className="flex items-center justify-center bg-white p-6 lg:bg-background lg:p-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Entrar no painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua loja Menuzin</p>

          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <Label>Senha</Label>
              <PasswordInput value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" required minLength={6} />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link to="/admin/recuperar-senha" className="font-medium text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
