import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

type State = "loading" | "valid" | "done" | "used" | "invalid";

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const json = (await res.json()) as {
          valid?: boolean;
          reason?: string;
          email?: string;
        };
        if (!active) return;
        setEmail(json.email ?? null);
        if (json.reason === "already_unsubscribed") setState("used");
        else if (json.valid) setState("valid");
        else setState("invalid");

      } catch {
        if (active) setState("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "invalid");
    } catch {
      setState("invalid");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-xl font-extrabold text-primary mb-6">Menuzin</p>

        {state === "loading" && <p className="text-muted-foreground">Verificando seu link…</p>}

        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold mb-3 text-foreground">Cancelar e-mails</h1>
            <p className="text-muted-foreground mb-6">
              Deseja parar de receber e-mails do Menuzin
              {email ? ` em ${email}` : ""}?
            </p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? "Processando…" : "Confirmar cancelamento"}
            </Button>
          </>
        )}

        {state === "done" && (
          <>
            <h1 className="text-2xl font-bold mb-3 text-foreground">Pronto!</h1>
            <p className="text-muted-foreground">
              Você não receberá mais e-mails do Menuzin neste endereço.
            </p>
          </>
        )}

        {state === "used" && (
          <>
            <h1 className="text-2xl font-bold mb-3 text-foreground">Já cancelado</h1>
            <p className="text-muted-foreground">
              Este endereço já estava descadastrado dos nossos e-mails.
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="text-2xl font-bold mb-3 text-foreground">Link inválido</h1>
            <p className="text-muted-foreground">
              Este link de cancelamento expirou ou não é válido. Fale com a gente pela página de
              contato.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Cancelar e-mails | Menuzin" },
      {
        name: "description",
        content: "Gerencie o recebimento de e-mails do Menuzin e cancele quando quiser.",
      },
      { property: "og:title", content: "Cancelar e-mails | Menuzin" },
      {
        property: "og:description",
        content: "Gerencie o recebimento de e-mails do Menuzin e cancele quando quiser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});
