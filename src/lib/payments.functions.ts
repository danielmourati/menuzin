// ============================================================
// Menuzin — Payment Server Functions (Mercado Pago manual creds)
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StorePaymentSettingsSafe } from "./payment-types";

// ---------- Encryption helpers (AES-GCM via Web Crypto) ----------

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("PAYMENT_ENCRYPTION_KEY ausente ou muito curta.");
  }
  // Derive 256-bit key from secret via SHA-256
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

async function encryptToken(plain: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource,
  );
  return `${b64encode(iv)}.${b64encode(ct)}`;
}

// (decrypt kept for future use by checkout server fns)
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

// ---------- DTO mapper ----------

type DbRow = {
  id: string;
  tenant_id: string;
  provider: string;
  mp_public_key: string | null;
  mp_user_id: string | null;
  mp_live_mode: boolean;
  mp_connected: boolean;
  mp_last_validated_at: string | null;
  cash_enabled: boolean;
  pix_manual_enabled: boolean;
  card_on_delivery_enabled: boolean;
  pix_enabled: boolean;
  credit_card_enabled: boolean;
  debit_card_enabled: boolean;
  pix_manual_key: string | null;
  pix_manual_key_type: string | null;
  pix_manual_receiver: string | null;
  created_at: string;
  updated_at: string;
};

function toSafe(row: DbRow): StorePaymentSettingsSafe {
  return {
    id: row.id,
    store_id: row.tenant_id,
    provider: row.provider as "mercadopago" | "manual",
    mp_user_id: row.mp_user_id ?? undefined,
    mp_public_key: row.mp_public_key ?? undefined,
    mp_connected: row.mp_connected,
    mp_live_mode: row.mp_live_mode,
    mp_token_expires_at: row.mp_last_validated_at ?? undefined,
    cash_enabled: row.cash_enabled,
    pix_manual_enabled: row.pix_manual_enabled,
    card_on_delivery_enabled: row.card_on_delivery_enabled,
    pix_enabled: row.pix_enabled,
    credit_card_enabled: row.credit_card_enabled,
    debit_card_enabled: row.debit_card_enabled,
    pix_manual_key: row.pix_manual_key ?? undefined,
    pix_manual_key_type: (row.pix_manual_key_type as any) ?? undefined,
    pix_manual_receiver: row.pix_manual_receiver ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function resolveTenantId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.tenant_id) throw new Error("Usuário não está vinculado a uma loja.");
  return data.tenant_id as string;
}

// ---------- Server Functions ----------

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StorePaymentSettingsSafe | null> => {
    const { supabase, userId } = context;
    const tenantId = await resolveTenantId(supabase, userId);
    const { data, error } = await supabase
      .from("store_payment_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      // Auto-create default row so toggles work right away
      const { data: created, error: insErr } = await supabase
        .from("store_payment_settings")
        .insert({ tenant_id: tenantId, provider: "mercadopago" })
        .select("*")
        .single();
      if (insErr) throw new Error(insErr.message);
      return toSafe(created as DbRow);
    }
    return toSafe(data as DbRow);
  });

export const saveMpCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      mp_public_key: z.string().min(10).max(200),
      mp_access_token: z.string().min(10).max(500),
      mp_live_mode: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Basic non-empty validation only — Mercado Pago credentials may have
    // varying prefixes (APP_USR-, TEST-, or no prefix for newer accounts).
    // The real validation is done against the MP API below.
    if (!data.mp_public_key.trim()) {
      return { success: false as const, message: "Public Key não pode estar vazia." };
    }
    if (!data.mp_access_token.trim()) {
      return { success: false as const, message: "Access Token não pode estar vazio." };
    }

    // Validate against MP API
    let mpUserId: string;
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${data.mp_access_token}` },
      });
      if (!res.ok) {
        const rawBody = await res.text();
        console.error("MP /users/me failed:", res.status, rawBody);

        // Try to parse structured MP error
        let mpMessage: string | undefined;
        let mpError: string | undefined;
        let mpCause: string | undefined;
        try {
          const parsed = JSON.parse(rawBody) as {
            message?: string;
            error?: string;
            cause?: Array<{ code?: string | number; description?: string }>;
          };
          mpMessage = parsed.message;
          mpError = parsed.error;
          if (Array.isArray(parsed.cause) && parsed.cause.length > 0) {
            mpCause = parsed.cause
              .map((c) => [c.code, c.description].filter(Boolean).join(": "))
              .join("; ");
          }
        } catch {
          // not JSON, keep raw
        }

        // Build suggestion based on status
        let suggestion = "";
        if (res.status === 401) {
          suggestion =
            "O Access Token foi rejeitado. Verifique se você copiou o token completo da sua conta Mercado Pago (Painel do Desenvolvedor → Credenciais) e se está usando o token correspondente ao modo selecionado (Sandbox/Produção).";
        } else if (res.status === 403) {
          suggestion =
            "Token sem permissão. Confirme se a aplicação no Mercado Pago tem as permissões de leitura e pagamentos habilitadas.";
        } else if (res.status === 404) {
          suggestion = "Endpoint não encontrado. Tente novamente em instantes.";
        } else if (res.status >= 500) {
          suggestion = "O Mercado Pago está indisponível no momento. Tente novamente em alguns minutos.";
        } else {
          suggestion = "Revise as credenciais no painel do Mercado Pago e tente novamente.";
        }

        const detail = mpMessage || mpError || rawBody.slice(0, 200) || "Sem detalhes adicionais.";
        const causeText = mpCause ? ` (causa: ${mpCause})` : "";

        return {
          success: false as const,
          message: `Mercado Pago rejeitou as credenciais (HTTP ${res.status}): ${detail}${causeText}. ${suggestion}`,
        };
      }
      const me = (await res.json()) as { id?: number | string; site_id?: string };
      if (!me.id) {
        return {
          success: false as const,
          message:
            "Resposta inesperada do Mercado Pago: o campo 'id' do usuário não foi retornado. Verifique se o Access Token pertence a uma conta válida.",
        };
      }
      mpUserId = String(me.id);
    } catch (err) {
      console.error("MP validation error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false as const,
        message: `Não foi possível conectar ao Mercado Pago: ${errMsg}. Verifique sua conexão e tente novamente.`,
      };
    }


    const tenantId = await resolveTenantId(supabase, userId);
    const encrypted = await encryptToken(data.mp_access_token);

    const { error } = await supabase
      .from("store_payment_settings")
      .upsert(
        {
          tenant_id: tenantId,
          provider: "mercadopago",
          mp_public_key: data.mp_public_key,
          mp_access_token_encrypted: encrypted,
          mp_user_id: mpUserId,
          mp_live_mode: data.mp_live_mode,
          mp_connected: true,
          mp_last_validated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
    if (error) {
      console.error("DB upsert error:", error);
      throw new Error(error.message);
    }

    // Build masked public key
    const parts = data.mp_public_key.split("-");
    const masked = parts.length >= 4
      ? parts.map((p, i) => (i === 1 || i === 2 ? "****" : p)).join("-")
      : data.mp_public_key.slice(0, 8) + "****" + data.mp_public_key.slice(-4);

    return {
      success: true as const,
      message: `Credenciais validadas com sucesso! Conectado como MP user ${mpUserId}.`,
      mp_public_key_masked: masked,
      mp_user_id: mpUserId,
    };
  });

export const disconnectMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const tenantId = await resolveTenantId(supabase, userId);
    const { error } = await supabase
      .from("store_payment_settings")
      .update({
        mp_connected: false,
        mp_public_key: null,
        mp_access_token_encrypted: null,
        mp_user_id: null,
        mp_last_validated_at: null,
        pix_enabled: false,
        credit_card_enabled: false,
        debit_card_enabled: false,
      })
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

const updatePatchSchema = z.object({
  cash_enabled: z.boolean().optional(),
  pix_manual_enabled: z.boolean().optional(),
  card_on_delivery_enabled: z.boolean().optional(),
  pix_enabled: z.boolean().optional(),
  credit_card_enabled: z.boolean().optional(),
  debit_card_enabled: z.boolean().optional(),
  pix_manual_key: z.string().max(200).nullable().optional(),
  pix_manual_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).nullable().optional(),
  pix_manual_receiver: z.string().max(200).nullable().optional(),
});

export const updatePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updatePatchSchema.parse(input))
  .handler(async ({ data, context }): Promise<StorePaymentSettingsSafe> => {
    const { supabase, userId } = context;
    const tenantId = await resolveTenantId(supabase, userId);
    const { data: row, error } = await supabase
      .from("store_payment_settings")
      .update(data)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toSafe(row as DbRow);
  });
