import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { checkAuthRateLimitFn, recordAuthFailureFn } from "@/lib/rate-limit.functions";

export const Route = createFileRoute("/admin/recuperar-senha")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const check = await checkAuthRateLimitFn({ data: { action: "forgot_password", identifier: email } });
      if (!check.allowed) {
        const mins = Math.ceil((check.resetInSeconds || 60) / 60);
        toast.error(`Muitas solicitações enviadas. Por favor, aguarde ${mins} minuto(s).`);
        return;
      }
    } catch {
      /* continue */
    }

    setSubmitting(true);
    try {
      // Record rate limit consumption
      await recordAuthFailureFn({
        data: { action: "forgot_password", identifier: email, maxAttempts: 3, windowSeconds: 900 },
      }).catch(() => {});

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/redefinir-senha`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("E-mail enviado! Verifique sua caixa de entrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar e-mail");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border bg-muted/30 p-4 text-sm">
            Se houver uma conta vinculada a <strong>{email}</strong>, você receberá em instantes um e-mail com o link de redefinição.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link to="/admin/login" className="font-semibold text-primary hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}

