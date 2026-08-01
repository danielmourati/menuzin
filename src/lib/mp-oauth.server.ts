// ============================================================
// Menuzin — Mercado Pago OAuth (conexão automática por lojista)
// SERVER ONLY. Nunca importar em componentes/rotas do cliente.
// ============================================================
import { encryptToken, decryptToken } from "@/lib/payment-crypto";

const MP_API = "https://api.mercadopago.com";
const AUTH_BASE = "https://auth.mercadopago.com.br/authorization";

export interface MpOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function getMpOAuthConfig(): MpOAuthConfig {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Conexão automática indisponível: MP_CLIENT_ID/MP_CLIENT_SECRET não configurados na plataforma.",
    );
  }
  return { clientId, clientSecret };
}

/**
 * URL de retorno registrada na aplicação do Mercado Pago.
 * Precisa bater exatamente com o cadastro da aplicação, por isso usamos
 * sempre o domínio publicado (e não o origin da requisição atual).
 */
export function resolveRedirectUri(_requestUrl?: string): string {
  const fromEnv = process.env["MP_OAUTH_REDIRECT_URI"];
  if (fromEnv) return fromEnv;
  return "https://menuzin.app/api/public/mp-oauth-callback";
}


export function buildAuthorizationUrl(params: {
  clientId: string;
  state: string;
  redirectUri: string;
}): string {
  const qs = new URLSearchParams({
    client_id: params.clientId,
    response_type: "code",
    platform_id: "mp",
    state: params.state,
    redirect_uri: params.redirectUri,
  });
  return `${AUTH_BASE}?${qs.toString()}`;
}

/** Cria um state de uso único (10 min) ligado ao tenant. */
export async function createOAuthState(tenantId: string, userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("mp_oauth_states")
    .insert({ tenant_id: tenantId, created_by: userId, expires_at: expiresAt })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Falha ao iniciar conexão.");
  return data.id as string;
}

/** Valida e consome o state; devolve o tenant_id. */
export async function consumeOAuthState(state: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("mp_oauth_states")
    .select("id, tenant_id, expires_at, used_at")
    .eq("id", state)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("state_invalido");
  if (data.used_at) throw new Error("state_ja_usado");
  if (new Date(data.expires_at as string).getTime() < Date.now()) throw new Error("state_expirado");
  await supabaseAdmin
    .from("mp_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id as string);
  return data.tenant_id as string;
}

interface MpTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number | string;
  public_key?: string;
  live_mode?: boolean;
}

async function postToken(body: Record<string, string>): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof json?.message === "string" ? json.message : `HTTP ${res.status}`;
    throw new Error(`Mercado Pago OAuth: ${msg}`);
  }
  return json as unknown as MpTokenResponse;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getMpOAuthConfig();
  return postToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
}

/** Salva a conexão OAuth (tokens criptografados) para o tenant. */
export async function persistOAuthConnection(tenantId: string, token: MpTokenResponse) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let publicKey = token.public_key ?? null;
  let accountKind: "test_user" | "production" = token.live_mode ? "production" : "test_user";
  try {
    const meRes = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        tags?: unknown[];
        nickname?: string;
        email?: string;
      };
      const tags = Array.isArray(me.tags) ? me.tags.map((t) => String(t).toLowerCase()) : [];
      const isTest =
        tags.includes("test_user") ||
        (typeof me.nickname === "string" && /^testuser/i.test(me.nickname)) ||
        (typeof me.email === "string" && /@testuser\.com$/i.test(me.email));
      accountKind = isTest ? "test_user" : "production";
    }
  } catch (err) {
    console.error("[mp-oauth] /users/me falhou:", err);
  }

  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin.from("store_payment_settings").upsert(
    {
      tenant_id: tenantId,
      provider: "mercadopago",
      mp_user_id: token.user_id != null ? String(token.user_id) : null,
      mp_public_key: publicKey,
      mp_access_token_encrypted: await encryptToken(token.access_token),
      mp_refresh_token_encrypted: token.refresh_token
        ? await encryptToken(token.refresh_token)
        : null,
      mp_token_expires_at: expiresAt,
      mp_connected: true,
      mp_connection_method: "oauth",
      mp_live_mode: accountKind === "production",
      mp_account_kind: accountKind,
      mp_last_validated_at: new Date().toISOString(),
      pix_enabled: true,
      credit_card_enabled: true,
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Retorna um access token válido do tenant, renovando via refresh_token
 * quando faltarem menos de 10 minutos para expirar.
 */
export async function getFreshAccessToken(tenantId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("store_payment_settings")
    .select(
      "mp_access_token_encrypted, mp_refresh_token_encrypted, mp_token_expires_at, mp_connection_method",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row?.mp_access_token_encrypted) {
    throw new Error("Mercado Pago não está conectado nesta loja");
  }

  const expiresAt = row.mp_token_expires_at ? new Date(row.mp_token_expires_at).getTime() : null;
  const needsRefresh =
    row.mp_connection_method === "oauth" &&
    !!row.mp_refresh_token_encrypted &&
    expiresAt !== null &&
    expiresAt - Date.now() < 10 * 60 * 1000;

  if (!needsRefresh) {
    return decryptToken(row.mp_access_token_encrypted);
  }

  try {
    const { clientId, clientSecret } = getMpOAuthConfig();
    const refreshToken = await decryptToken(row.mp_refresh_token_encrypted as string);
    const token = await postToken({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    await supabaseAdmin
      .from("store_payment_settings")
      .update({
        mp_access_token_encrypted: await encryptToken(token.access_token),
        mp_refresh_token_encrypted: token.refresh_token
          ? await encryptToken(token.refresh_token)
          : row.mp_refresh_token_encrypted,
        mp_token_expires_at: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000).toISOString()
          : null,
        mp_last_validated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);
    return token.access_token;
  } catch (err) {
    console.error("[mp-oauth] refresh falhou, usando token atual:", err);
    return decryptToken(row.mp_access_token_encrypted);
  }
}
