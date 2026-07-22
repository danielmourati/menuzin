import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { listTenantLoginUsers } from "@/lib/account.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, isPlatformAdmin } = useAuth();
  const [slug, setSlug] = useState("");
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"loja" | "admin">("loja");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: isPlatformAdmin ? "/platform/dashboard" : "/admin/dashboard" });
    }
  }, [loading, isAuthenticated, isPlatformAdmin, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(slug.trim().toLowerCase()), 350);
    return () => clearTimeout(t);
  }, [slug]);

  const usersQ = useQuery({
    queryKey: ["login-users", debouncedSlug],
    queryFn: () => listTenantLoginUsers({ data: { slug: debouncedSlug } }),
    enabled: mode === "loja" && debouncedSlug.length >= 2,
    staleTime: 30_000,
  });

  const users = usersQ.data?.users ?? [];
  const tenantName = usersQ.data?.tenant?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Selecione um usuário.");
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

          <div className="mt-5 flex rounded-lg border p-1 text-sm">
            <button
              type="button"
              onClick={() => { setMode("loja"); setEmail(""); }}
              className={`flex-1 rounded-md py-1.5 font-medium transition ${mode === "loja" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Por loja
            </button>
            <button
              type="button"
              onClick={() => { setMode("admin"); setEmail(""); }}
              className={`flex-1 rounded-md py-1.5 font-medium transition ${mode === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Admin Menuzin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" autoComplete="off">
            {mode === "loja" ? (
              <>
                <div>
                  <Label>Loja (endereço público)</Label>
                  <div className="mt-1.5 flex items-center rounded-md border bg-background">
                    <span className="px-3 text-sm text-muted-foreground">menuzin.app/</span>
                    <input
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setEmail(""); }}
                      placeholder="minhaloja"
                      autoComplete="off"
                      className="h-10 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  {tenantName && <p className="mt-1 text-xs text-muted-foreground">{tenantName}</p>}
                </div>
                <div>
                  <Label>Usuário</Label>
                  <Select value={email} onValueChange={setEmail} disabled={!users.length}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={
                        usersQ.isFetching ? "Carregando..." :
                        debouncedSlug.length < 2 ? "Informe a loja" :
                        users.length ? "Selecione um usuário" : "Nenhum usuário encontrado"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.email} value={u.email}>
                          <span className="font-medium">{u.full_name}</span>
                          {u.role && <span className="ml-1 text-xs text-muted-foreground">• {u.role}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required autoComplete="off" />
              </div>
            )}
            <div>
              <Label>Senha</Label>
              <PasswordInput
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="mt-1.5"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={submitting || !email}>
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
