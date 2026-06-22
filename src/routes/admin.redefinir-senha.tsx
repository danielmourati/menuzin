import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/redefinir-senha")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase processa o token de recuperação no hash da URL e dispara PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao alterar senha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Redefinir senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>

        {!ready ? (
          <div className="mt-6 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Validando link de recuperação... Se o link expirou,{" "}
            <Link to="/admin/recuperar-senha" className="font-semibold text-primary hover:underline">
              solicite um novo
            </Link>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label>Nova senha</Label>
              <PasswordInput value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" required minLength={6} />
            </div>
            <div>
              <Label>Confirmar senha</Label>
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" required minLength={6} />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
