import { createFileRoute } from "@tanstack/react-router";
import { createSign } from "crypto";
import { z } from "zod";

const SignRequestSchema = z.object({
  request: z.string().min(1).max(64_000),
});

export const Route = createFileRoute("/api/public/qz")({
  server: {
    handlers: {
      GET: async () => {
        const raw = process.env.QZ_CERT_PEM;
        if (!raw) return json({ cert: "", configured: false as const });
        return json({ cert: normalizePem(raw), configured: true as const });
      },
      POST: async ({ request }) => {
        const raw = process.env.QZ_PRIVATE_KEY_PEM;
        if (!raw) return json({ signature: "", configured: false as const });

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
          const signature = signer.sign(normalizePem(raw)).toString("base64");
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

function normalizePem(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (v.includes("\\n") && !v.includes("\n")) {
    v = v.replace(/\\n/g, "\n");
  }
  v = v.replace(/\r\n/g, "\n").trim();
  if (!v.includes("\n")) {
    const m = v.match(/^-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----$/);
    if (m) {
      const label = m[1];
      const body = m[2].replace(/\s+/g, "");
      const chunks = body.match(/.{1,64}/g) ?? [body];
      v = `-----BEGIN ${label}-----\n${chunks.join("\n")}\n-----END ${label}-----`;
    }
  }
  return `${v}\n`;
}