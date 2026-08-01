// ============================================================
// Menuzin — AES-GCM helpers para credenciais de pagamento
// process.env é lido apenas dentro das funções (nunca no escopo do módulo).
// ============================================================

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("PAYMENT_ENCRYPTION_KEY ausente ou muito curta.");
  }
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plain: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource,
  );
  return `${b64encode(iv)}.${b64encode(ct)}`;
}

export async function decryptToken(encoded: string): Promise<string> {
  const [ivB64, ctB64] = encoded.split(".");
  if (!ivB64 || !ctB64) throw new Error("Token criptografado inválido.");
  const key = await getCryptoKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) as BufferSource },
    key,
    b64decode(ctB64) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}
