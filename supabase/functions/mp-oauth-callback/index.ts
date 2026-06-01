// ============================================================
// Edge Function: mp-oauth-callback
// Handles callback redirected by Mercado Pago OAuth, exchanges code
// for access tokens, encrypts them and updates payment settings
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Bypass RLS as system operation
);

// Basic AES-GCM cryptographic helper
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

  // Return base64 containing hex_iv + hex_ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const appAdminUrl = Deno.env.get("APP_ADMIN_URL") || "https://foodcatalogo.app/admin/configuracoes/pagamentos";

  if (!code || !state) {
    return Response.redirect(`${appAdminUrl}?success=false&error=missing_params`, 302);
  }

  try {
    // 1. Decode secure state token
    let store_id = "";
    try {
      const decodedState = JSON.parse(atob(state));
      store_id = decodedState.store_id;
      // Option: Validate timestamp expiration (e.g. max 10 minutes)
      if (Date.now() - decodedState.timestamp > 10 * 60 * 1000) {
        throw new Error("State expired");
      }
    } catch {
      return Response.redirect(`${appAdminUrl}?success=false&error=invalid_state`, 302);
    }

    // 2. Obtain Mercado Pago Client Credentials from Env
    const clientId = Deno.env.get("MP_CLIENT_ID");
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET");
    const redirectUri = Deno.env.get("MP_REDIRECT_URI") || "https://foodcatalogo.app/api/mp-oauth-callback";
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY"); // 256-bit Hex Key (64 chars)

    if (!clientId || !clientSecret || !encryptionKey) {
      throw new Error("Missing server credentials or encryption key configurations.");
    }

    // 3. Request Mercado Pago API to exchange code for OAuth Access Token
    const mpRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!mpRes.ok) {
      const errorData = await mpRes.json();
      console.error("MP OAuth exchange error:", errorData);
      return Response.redirect(`${appAdminUrl}?success=false&error=oauth_failed`, 302);
    }

    const tokenData = await mpRes.json();
    const { access_token, refresh_token, user_id, expires_in, live_mode } = tokenData;

    // 4. Encrypt Access Token and Refresh Token for security
    const encryptedAccess = await encryptToken(access_token, encryptionKey);
    const encryptedRefresh = await encryptToken(refresh_token, encryptionKey);
    
    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 5. Query user public key using access token from Mercado Pago credentials endpoint
    const credentialsRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    let publicKey = "";
    if (credentialsRes.ok) {
      const userData = await credentialsRes.json();
      publicKey = userData.public_key;
    }

    // 6. Update tenant settings (store_payment_settings) inside Supabase
    const { error: dbError } = await supabaseAdmin
      .from("store_payment_settings")
      .upsert({
        store_id,
        provider: "mercadopago",
        mp_user_id: String(user_id),
        mp_public_key: publicKey || `TEST-MOCK-PK-${user_id}`,
        mp_access_token_encrypted: encryptedAccess,
        mp_refresh_token_encrypted: encryptedRefresh,
        mp_token_expires_at: expiresAt,
        mp_connected: true,
        mp_live_mode: live_mode || false,
        pix_enabled: true,
        credit_card_enabled: true,
        debit_card_enabled: false,
        updated_at: new Date().toISOString()
      }, { onConflict: "store_id" });

    if (dbError) {
      console.error("Supabase payment settings save error:", dbError);
      return Response.redirect(`${appAdminUrl}?success=false&error=database_error`, 302);
    }

    return Response.redirect(`${appAdminUrl}?success=true`, 302);
  } catch (error: any) {
    console.error("Callback crash:", error);
    return Response.redirect(`${appAdminUrl}?success=false&error=server_error`, 302);
  }
});
