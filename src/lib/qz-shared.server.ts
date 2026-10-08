// Certificado QZ Tray compartilhado com o Degust (um único cert para as duas
// plataformas). O Degust aceita o cabeçalho x-qz-shared-secret = QZ_SHARED_SECRET.
// O segredo só é lido aqui no servidor; nunca chega ao navegador.
const DEGUST_URL = "https://cgmgpejuoymoumyfpwkc.supabase.co/functions/v1";
const DEGUST_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbWdwZWp1b3ltb3VteWZwd2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjUzOTAsImV4cCI6MjA5MDg0MTM5MH0.Us_WETrK4AAKQTyJrMCsZS-WX8hdfvYAD94eMz4J4_Q";

let certCache: { pem: string; at: number } | null = null;

async function callDegust(fn: string, body: unknown): Promise<any> {
  const secret = process.env.QZ_SHARED_SECRET;
  if (!secret) throw new Error("QZ_SHARED_SECRET ausente");
  const res = await fetch(`${DEGUST_URL}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: DEGUST_ANON,
      Authorization: `Bearer ${DEGUST_ANON}`,
      "x-qz-shared-secret": secret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${fn} HTTP ${res.status}`);
  return res.json();
}

export function hasSharedSecret(): boolean {
  return Boolean(process.env.QZ_SHARED_SECRET);
}

export async function fetchSharedCert(): Promise<string> {
  if (certCache && Date.now() - certCache.at < 5 * 60_000) return certCache.pem;
  const data = await callDegust("qz-cert", {});
  const pem = typeof data?.cert_pem === "string" ? data.cert_pem : "";
  if (!pem.includes("BEGIN CERTIFICATE")) throw new Error("cert_pem inválido");
  certCache = { pem, at: Date.now() };
  return pem;
}

export async function signShared(request: string): Promise<string> {
  const data = await callDegust("qz-sign", { request });
  if (typeof data?.signature !== "string" || !data.signature) throw new Error("assinatura ausente");
  return data.signature;
}
