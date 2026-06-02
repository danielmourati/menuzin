// Fallback Edge Function para assinatura do QZ Tray.
//
// A rota principal é /api/public/qz (TanStack server route, Node runtime).
// Esta Edge Function é equivalente e existe como backup para casos em que
// o domínio principal do app fica bloqueado em alguma rede do cliente
// (firewall corporativo, etc.).
//
// Endpoints:
//   GET  /functions/v1/qz-sign        -> { cert, configured, subjectCN, error? }
//   POST /functions/v1/qz-sign        -> body { request: string }
//                                        -> { signature, configured, error? }
//
// Usa os mesmos secrets `QZ_CERT_PEM` e `QZ_PRIVATE_KEY_PEM` da rota principal.
// Bloqueia o cert demo do QZ Industries (sempre dispara prompt no QZ Tray).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

type CertCheck =
  | { ok: true; certPem: string; keyPem: string; subjectCN: string }
  | { ok: false; reason: string };

let cached: CertCheck | null = null;

async function loadConfig(): Promise<CertCheck> {
  if (cached) return cached;
  const certRaw = Deno.env.get("QZ_CERT_PEM");
  const keyRaw = Deno.env.get("QZ_PRIVATE_KEY_PEM");
  if (!certRaw || !keyRaw) {
    cached = { ok: false, reason: "QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM ausentes." };
    return cached;
  }
  const certPem = normalizePem(certRaw);
  const keyPem = normalizePem(keyRaw);

  // Parse mínimo do subject para detectar cert demo.
  const der = pemToDer(certPem);
  const ascii = Array.from(der, (b) =>
    b >= 32 && b < 127 ? String.fromCharCode(b) : " ",
  ).join("");
  if (/QZ Industries/i.test(ascii)) {
    cached = {
      ok: false,
      reason: "QZ_CERT_PEM é o certificado de demonstração do QZ Tray. Substitua.",
    };
    return cached;
  }
  const cnMatch = ascii.match(/CN[^A-Za-z0-9]{1,4}([A-Za-z0-9 .\-_*]{3,80})/);
  const subjectCN = cnMatch ? cnMatch[1].trim() : "(desconhecido)";

  // Verifica par cert/chave importando a privKey e tentando uma assinatura.
  try {
    await importPrivateKey(keyPem);
  } catch (err) {
    cached = {
      ok: false,
      reason: `QZ_PRIVATE_KEY_PEM inválida: ${err instanceof Error ? err.message : String(err)}`,
    };
    return cached;
  }

  cached = { ok: true, certPem, keyPem, subjectCN };
  return cached;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToDer(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
    false,
    ["sign"],
  );
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function normalizePem(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (v.includes("\\n") && !v.includes("\n")) v = v.replace(/\\n/g, "\n");
  v = v.replace(/\r\n/g, "\n").trim();
  if (!v.includes("\n")) {
    const m = v.match(/^-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----$/);
    if (m) {
      const body = m[2].replace(/\s+/g, "");
      const chunks = body.match(/.{1,64}/g) ?? [body];
      v = `-----BEGIN ${m[1]}-----\n${chunks.join("\n")}\n-----END ${m[1]}-----`;
    }
  }
  return `${v}\n`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const cfg = await loadConfig();

  if (req.method === "GET") {
    if (!cfg.ok) return json({ cert: "", configured: false, error: cfg.reason });
    return json({ cert: cfg.certPem, configured: true, subjectCN: cfg.subjectCN });
  }

  if (req.method === "POST") {
    if (!cfg.ok) return json({ signature: "", configured: false, error: cfg.reason });
    let body: { request?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo JSON inválido." }, 400);
    }
    const request = typeof body?.request === "string" ? body.request : null;
    if (!request || request.length < 1 || request.length > 64_000) {
      return json({ error: "Requisição de assinatura inválida." }, 400);
    }
    try {
      const key = await importPrivateKey(cfg.keyPem);
      const sig = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        key,
        new TextEncoder().encode(request),
      );
      return json({ signature: bytesToBase64(new Uint8Array(sig)), configured: true });
    } catch (err) {
      console.error("[qz-sign] erro ao assinar:", err);
      return json({ error: "Falha ao assinar requisição do QZ Tray." }, 500);
    }
  }

  return json({ error: "Método não suportado." }, 405);
});
