// ============================================================
// Edge Function: mp-save-credentials
// Receives manual MP credentials (Public Key + Access Token)
// from an authenticated admin user, encrypts the Access Token
// server-side and persists to store_payment_settings.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── AES-GCM Encryption (same algorithm used by mp-oauth-callback) ──────────

async function encryptToken(plainText: string, secretKeyHex: string): Promise<string> {
  const rawKey = new Uint8Array(
    secretKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encodedText
  );

  // Return base64 containing iv + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// ── Mask Public Key for display (never returns the real key to the frontend) ──

function maskKey(key: string): string {
  const parts = key.split("-");
  if (parts.length >= 4) {
    return parts.map((p: string, i: number) => (i === 1 || i === 2 ? "****" : p)).join("-");
  }
  return key.slice(0, 8) + "****" + key.slice(-4);
}

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. Parse request body ──────────────────────────────────────────────
    const body = await req.json();
    const { store_id, mp_public_key, mp_access_token, mp_live_mode } = body as {
      store_id: string;
      mp_public_key: string;
      mp_access_token: string;
      mp_live_mode: boolean;
    };

    if (!store_id || !mp_public_key || !mp_access_token) {
      return new Response(
        JSON.stringify({ success: false, message: "store_id, mp_public_key e mp_access_token são obrigatórios." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Validate credential formats ─────────────────────────────────────
    const validPrefixes = ["APP_USR-", "TEST-"];
    if (!validPrefixes.some((p) => mp_public_key.startsWith(p))) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "mp_public_key inválida. Deve começar com APP_USR- (Produção) ou TEST- (Sandbox).",
        }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (!validPrefixes.some((p) => mp_access_token.startsWith(p))) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "mp_access_token inválido. Deve começar com APP_USR- (Produção) ou TEST- (Sandbox).",
        }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Authenticate the requesting user via Authorization header ───────
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Não autorizado." }),
        { status: 401, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Verify the user owns the store (tenant isolation) ──────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: storeData, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", store_id)
      .eq("owner_user_id", user.id)
      .single();

    if (storeError || !storeData) {
      return new Response(
        JSON.stringify({ success: false, message: "Acesso negado: loja não pertence ao usuário." }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Encrypt the Access Token ────────────────────────────────────────
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length !== 64) {
      console.error("TOKEN_ENCRYPTION_KEY is missing or not 256-bit (64 hex chars).");
      return new Response(
        JSON.stringify({ success: false, message: "Configuração de servidor inválida." }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const encryptedAccessToken = await encryptToken(mp_access_token, encryptionKey);

    // ── 6. Upsert payment settings in the database ─────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from("store_payment_settings")
      .upsert(
        {
          store_id,
          provider: "mercadopago",
          mp_public_key,
          mp_access_token_encrypted: encryptedAccessToken,
          mp_refresh_token_encrypted: null, // Manual creds have no refresh token
          mp_token_expires_at: null,        // Manual creds don't auto-expire
          mp_connected: true,
          mp_live_mode: mp_live_mode ?? false,
          pix_enabled: true,
          credit_card_enabled: true,
          debit_card_enabled: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

    if (dbError) {
      console.error("Database save error:", dbError);
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao salvar credenciais no banco de dados." }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 7. Return success with masked public key ───────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        message: "Credenciais salvas com sucesso! Mercado Pago conectado.",
        mp_public_key_masked: maskKey(mp_public_key),
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    console.error("mp-save-credentials crash:", err);
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
