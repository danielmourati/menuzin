import { createFileRoute } from "@tanstack/react-router";
import { createSign } from "crypto";
import { z } from "zod";
import { getQzConfig } from "@/lib/qz-config.server";

const SignRequestSchema = z.object({
  request: z.string().min(1).max(64_000),
});

export const Route = createFileRoute("/api/public/qz")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = getQzConfig();
        if (!cfg.ok) {
          return json({ cert: "", configured: false as const, error: cfg.reason });
        }
        return json({
          cert: cfg.cert,
          configured: true as const,
          subjectCN: cfg.subjectCN,
        });
      },
      POST: async ({ request }) => {
        const cfg = getQzConfig();
        if (!cfg.ok) {
          return json({ signature: "", configured: false as const, error: cfg.reason });
        }

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

        try {
          const signer = createSign("RSA-SHA512");
          signer.update(parsed.data.request);
          signer.end();
          const signature = signer.sign(cfg.privateKey).toString("base64");
          return json({ signature, configured: true as const });
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
