import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { changeMyPassword } from "@/lib/account.functions";

export const Route = createFileRoute("/admin/trocar-senha")({
  component: ChangePasswordPage,
});

const rules: { label: string; test: (s: string) => boolean }[] = [
  { label: "Mínimo de 8 caracteres", test: (s) => s.length >= 8 },
  { label: "Letra maiúscula (A-Z)", test: (s) => /[A-Z]/.test(s) },
  { label: "Letra minúscula (a-z)", test: (s) => /[a-z]/.test(s) },
  { label: "Número (0-9)", test: (s) => /[0-9]/.test(s) },
  { label: "Caractere especial (!@#…)", test: (s) => /[^A-Za-z0-9]/.test(s) },
];

function ChangePasswordPage() {
  const { refresh, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  const allValid = rules.every((r) => r.test(pwd)) && pwd === confirm;
  const forced = profile?.must_change_password === true;

  const mut = useMutation({
    mutationFn: () => changeMyPassword({ data: { new_password: pwd } }),
    onSuccess: async () => {
      toast.success("Senha atualizada com sucesso!");
      await refresh();
      navigate({ to: "/admin/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {forced ? "Defina sua nova senha" : "Alterar senha"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {forced
                ? "Por segurança, troque a senha inicial antes de continuar."
                : "Atualize sua senha de acesso."}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!allValid) {
              toast.error("Sua senha não atende aos critérios.");
              return;
            }
            mut.mutate();
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              className="mt-1.5"
              maxLength={72}
            />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-1.5"
              maxLength={72}
            />
            {confirm.length > 0 && confirm !== pwd && (
              <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <ul className="space-y-1.5 rounded-xl bg-muted/40 p-3 text-xs">
            {rules.map((r) => {
              const ok = r.test(pwd);
              return (
                <li key={r.label} className="flex items-center gap-2">
                  {ok ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                    {r.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <Button type="submit" className="h-11 w-full" disabled={!allValid || mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>

          {forced && (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full text-muted-foreground"
              onClick={async () => {
                await signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              Sair
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
