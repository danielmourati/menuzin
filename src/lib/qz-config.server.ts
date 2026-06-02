// Carregamento e validação do par cert/chave QZ Tray. Compartilhado entre
// as rotas /api/public/qz (JSON) e /api/public/qz-cert.crt (PEM cru).
import { createPublicKey, X509Certificate } from "crypto";

export type QzConfig =
  | { ok: true; cert: string; privateKey: string; subjectCN: string }
  | { ok: false; reason: string };

let cached: QzConfig | null = null;

export function getQzConfig(): QzConfig {
  if (cached) return cached;
  const certRaw = process.env.QZ_CERT_PEM;
  const keyRaw = process.env.QZ_PRIVATE_KEY_PEM;
  if (!certRaw || !keyRaw) {
    cached = { ok: false, reason: "QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM ausentes." };
    return cached;
  }
  const cert = normalizePem(certRaw);
  const privateKey = normalizePem(keyRaw);

  let subjectCN = "";
  try {
    const x509 = new X509Certificate(cert);
    subjectCN = extractCN(x509.subject) || x509.subject;
    if (/QZ Industries/i.test(x509.subject) || /QZ Industries/i.test(x509.issuer)) {
      cached = {
        ok: false,
        reason:
          "QZ_CERT_PEM é o certificado de demonstração do QZ Tray. Substitua por um cert próprio.",
      };
      return cached;
    }
  } catch (err) {
    cached = {
      ok: false,
      reason: `QZ_CERT_PEM inválido: ${err instanceof Error ? err.message : String(err)}`,
    };
    return cached;
  }

  try {
    const certPub = createPublicKey(cert).export({ type: "spki", format: "der" });
    const keyPub = createPublicKey({ key: privateKey, format: "pem" }).export({
      type: "spki",
      format: "der",
    });
    if (!Buffer.from(certPub).equals(Buffer.from(keyPub))) {
      cached = {
        ok: false,
        reason: "QZ_CERT_PEM e QZ_PRIVATE_KEY_PEM não correspondem ao mesmo par de chaves.",
      };
      return cached;
    }
  } catch (err) {
    cached = {
      ok: false,
      reason: `Falha ao validar par cert/chave: ${err instanceof Error ? err.message : String(err)}`,
    };
    return cached;
  }

  cached = { ok: true, cert, privateKey, subjectCN };
  return cached;
}

export function normalizePem(raw: string): string {
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

export function extractCN(subject: string): string | null {
  const m = subject.match(/(?:^|\n)CN=([^\n]+)/);
  return m ? m[1].trim() : null;
}
