import { createFileRoute } from "@tanstack/react-router";
import { createSign } from "crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getQzConfig } from "@/lib/qz-config.server";
import { fetchSharedCert, hasSharedSecret, signShared } from "@/lib/qz-shared.server";

const SignRequestSchema = z.object({
  request: z.string().min(1).max(64_000),
});

async function requireAuthenticatedCaller(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Não autorizado: sessão necessária para assinar." }, 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) return json({ error: "Não autorizado: token vazio." }, 401);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("[qz-api] SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY ausentes — não dá pra validar JWT.");
    return json({ error: "Configuração de autenticação ausente no servidor." }, 500);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return json({ error: "Não autorizado: token inválido." }, 401);
  }
  return null;
}


export const Route = createFileRoute("/api/public/qz")({
  server: {
    handlers: {
      GET: async () => {
        if (hasSharedSecret()) {
          try {
            const cert = await fetchSharedCert();
            return json({ cert, configured: true as const, subjectCN: "Degust PDV", source: "shared" as const });
          } catch (err) {
            console.error("[qz-api] cert compartilhado indisponível, usando local", String(err));
          }
        }
        const cfg = getQzConfig();
        if (!cfg.ok) {
          return json({ cert: "", configured: false as const, error: cfg.reason });
        }
        return json({
          cert: cfg.cert,
          configured: true as const,
          subjectCN: cfg.subjectCN,
          source: "local" as const,
        });
      },
      POST: async ({ request }) => {
        // QZ Tray signing requires an authenticated admin session.
        const authErr = await requireAuthenticatedCaller(request);
        if (authErr) return authErr;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo JSON inválido." }, 400);
        }

        const parsed = SignRequestSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Requisição de assinatura inválida." }, 400);
        }

        // Mesma origem do GET: se o cert compartilhado está disponível, assina lá.
        if (hasSharedSecret()) {
          try {
            await fetchSharedCert();
            const signature = await signShared(parsed.data.request);
            return json({ signature, configured: true as const, source: "shared" as const });
          } catch (err) {
            console.error("[qz-api] assinatura compartilhada falhou, usando local", String(err));
          }
        }

        const cfg = getQzConfig();
        if (!cfg.ok) {
          return json({ signature: "", configured: false as const, error: cfg.reason });
        }

        try {
          const signer = createSign("RSA-SHA512");
          signer.update(parsed.data.request);
          signer.end();
          const signature = signer.sign(cfg.privateKey).toString("base64");
          return json({ signature, configured: true as const, source: "local" as const });
        } catch (err) {
          console.error("[qz-api] Falha ao assinar requisição QZ Tray", {
            message: err instanceof Error ? err.message : String(err),
          });
          return json({ error: "Falha ao assinar requisição do QZ Tray." }, 500);
        }
      },
    },
  },
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
