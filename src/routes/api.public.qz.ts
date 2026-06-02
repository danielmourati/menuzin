import { createFileRoute } from "@tanstack/react-router";
import { createPublicKey, createSign, X509Certificate } from "crypto";
import { z } from "zod";

const SignRequestSchema = z.object({
  request: z.string().min(1).max(64_000),
});

/**
 * Estado de configuração computado uma vez (por isolate). Valida que:
 *   - QZ_CERT_PEM e QZ_PRIVATE_KEY_PEM estão presentes
 *   - cert e chave formam um par RSA válido (mesma chave pública)
 *   - o cert NÃO é o certificado de demonstração do QZ Tray
 *     (que sempre dispara o prompt "Untrusted website" — não pode ser confiado)
 */
type QzConfig =
  | { ok: true; cert: string; privateKey: string; subjectCN: string }
  | { ok: false; reason: string };

let cachedConfig: QzConfig | null = null;

function getConfig(): QzConfig {
  if (cachedConfig) return cachedConfig;
  const certRaw = process.env.QZ_CERT_PEM;
  const keyRaw = process.env.QZ_PRIVATE_KEY_PEM;
  if (!certRaw || !keyRaw) {
    cachedConfig = { ok: false, reason: "QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM ausentes." };
    return cachedConfig;
  }
  const cert = normalizePem(certRaw);
  const privateKey = normalizePem(keyRaw);

  let subjectCN = "";
  try {
    const x509 = new X509Certificate(cert);
    subjectCN = extractCN(x509.subject) || x509.subject;
    // Bloqueio explícito do cert demo do QZ Tray — esse cert é hard-coded como
    // "untrusted" pelo QZ Tray e nunca pode ser permanentemente confiado.
    if (/QZ Industries/i.test(x509.subject) || /QZ Industries/i.test(x509.issuer)) {
      cachedConfig = {
        ok: false,
        reason:
          "QZ_CERT_PEM é o certificado de demonstração do QZ Tray. Substitua por um cert próprio.",
      };
      console.error("[qz-api]", cachedConfig.reason);
      return cachedConfig;
    }
  } catch (err) {
    cachedConfig = {
      ok: false,
      reason: `QZ_CERT_PEM inválido: ${err instanceof Error ? err.message : String(err)}`,
    };
    console.error("[qz-api]", cachedConfig.reason);
    return cachedConfig;
  }

  // Confere que cert e chave casam (mesma chave pública).
  try {
    const certPub = createPublicKey(cert).export({ type: "spki", format: "der" });
    const keyPub = createPublicKey({ key: privateKey, format: "pem" }).export({
      type: "spki",
      format: "der",
    });
    if (!Buffer.from(certPub).equals(Buffer.from(keyPub))) {
      cachedConfig = {
        ok: false,
        reason: "QZ_CERT_PEM e QZ_PRIVATE_KEY_PEM não correspondem ao mesmo par de chaves.",
      };
      console.error("[qz-api]", cachedConfig.reason);
      return cachedConfig;
    }
  } catch (err) {
    cachedConfig = {
      ok: false,
      reason: `Falha ao validar par cert/chave: ${err instanceof Error ? err.message : String(err)}`,
    };
    console.error("[qz-api]", cachedConfig.reason);
    return cachedConfig;
  }

  cachedConfig = { ok: true, cert, privateKey, subjectCN };
  return cachedConfig;
}

export const Route = createFileRoute("/api/public/qz")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = getConfig();
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
        const cfg = getConfig();
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

function extractCN(subject: string): string | null {
  // X509Certificate.subject é multilinha: "CN=Foo\nO=Bar"
  const m = subject.match(/(?:^|\n)CN=([^\n]+)/);
  return m ? m[1].trim() : null;
}
