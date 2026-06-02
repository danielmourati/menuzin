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
  mp_account_kind: string | null;
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
  const kind = row.mp_account_kind === "test_user" || row.mp_account_kind === "production"
    ? row.mp_account_kind
    : undefined;
  return {
    id: row.id,
    store_id: row.tenant_id,
    provider: row.provider as "mercadopago" | "manual",
    mp_user_id: row.mp_user_id ?? undefined,
    mp_public_key: row.mp_public_key ?? undefined,
    mp_connected: row.mp_connected,
    mp_live_mode: row.mp_live_mode,
    mp_account_kind: kind,
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
  const { resolveEffectiveTenantId } = await import("@/lib/active-tenant.server");
  const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
  return tenantId;
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
    let mpAccountKind: "test_user" | "production" = "production";
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
      const me = (await res.json()) as {
        id?: number | string;
        site_id?: string;
        tags?: string[];
        email?: string;
        nickname?: string;
      };
      if (!me.id) {
        return {
          success: false as const,
          message:
            "Resposta inesperada do Mercado Pago: o campo 'id' do usuário não foi retornado. Verifique se o Access Token pertence a uma conta válida.",
        };
      }
      mpUserId = String(me.id);

      // Detect test user — MP marks accounts created via Test Users API with
      // tags: ["test_user", ...] (sometimes also "normal"). Real seller
      // accounts never include "test_user". The nickname pattern
      // "TESTUSER..." or email "@testuser.com" is an extra hint.
      const tags = Array.isArray(me.tags) ? me.tags.map((t) => String(t).toLowerCase()) : [];
      const isTestNickname = typeof me.nickname === "string" && /^testuser/i.test(me.nickname);
      const isTestEmail = typeof me.email === "string" && /@testuser\.com$/i.test(me.email);
      mpAccountKind = tags.includes("test_user") || isTestNickname || isTestEmail ? "test_user" : "production";

      // Coherence check: live mode flag vs actual account kind
      if (data.mp_live_mode && mpAccountKind === "test_user") {
        return {
          success: false as const,
          message:
            "Você marcou Modo Produção, mas as credenciais informadas são de um Usuário de Teste. Use credenciais da sua conta real do Mercado Pago, ou desligue o Modo Produção para usar o sandbox.",
        };
      }
      if (!data.mp_live_mode && mpAccountKind === "production") {
        return {
          success: false as const,
          message:
            "As credenciais informadas são de Produção, mas o Modo Teste está ativado. Para testar com cartões e Pix de sandbox, crie um Usuário de Teste em https://www.mercadopago.com.br/developers/panel/test-users e use as credenciais dele. Caso queira receber pagamentos reais, ative o Modo Produção.",
        };
      }
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
          mp_account_kind: mpAccountKind,
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

    const kindLabel = mpAccountKind === "test_user" ? "Usuário de Teste" : "Produção";
    return {
      success: true as const,
      message: `Credenciais validadas! Conta MP #${mpUserId} (${kindLabel}).`,
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

// Public read by slug — used by the storefront checkout to decide which
// payment methods to show. Returns only safe (non-secret) fields.
export const getPublicPaymentSettingsBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({
      slug: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<StorePaymentSettingsSafe | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) return null;

    const { data: row, error } = await supabaseAdmin
      .from("store_payment_settings")
      .select(
        "id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected, mp_last_validated_at, cash_enabled, pix_manual_enabled, card_on_delivery_enabled, pix_enabled, credit_card_enabled, debit_card_enabled, pix_manual_key, pix_manual_key_type, pix_manual_receiver, created_at, updated_at",
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toSafe(row as DbRow);
  });

// ============================================================
// Transparent checkout (Pix + Card) — public, no auth required
// ============================================================

type MpPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  message?: string;
  error?: string;
  cause?: Array<{ code?: string | number; description?: string }>;
};

function mapMpStatus(
  s?: string,
): "pending" | "approved" | "rejected" | "refunded" | "manual" {
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "cancelled") return "rejected";
  if (s === "refunded" || s === "charged_back") return "refunded";
  return "pending";
}

const PayerSchema = z.object({
  email: z.string().email().max(200),
  first_name: z.string().min(1).max(120),
  last_name: z.string().min(1).max(120),
  identification: z
    .object({
      type: z.enum(["CPF", "CNPJ"]),
      number: z.string().min(8).max(20),
    })
    .optional(),
});

const CreateTransparentPaymentInput = z.object({
  store_slug: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  order_id: z.string().uuid(),
  payment_method: z.enum(["pix_online", "credit_card", "debit_card"]),
  card_token: z.string().min(4).max(200).optional(),
  installments: z.number().int().min(1).max(24).optional(),
  payer: PayerSchema,
});

export const createTransparentPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    CreateTransparentPaymentInput.parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // 1. Resolve tenant by slug
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("slug", data.store_slug)
      .eq("active", true)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Loja não encontrada");

    // 2. Load order, ensure it belongs to the tenant
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, tenant_id, number, total, payment_status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.tenant_id !== tenant.id) {
      throw new Error("Pedido não pertence a esta loja");
    }

    // 3. Load tenant payment settings + decrypt access token
    const { data: settings, error: sErr } = await supabaseAdmin
      .from("store_payment_settings")
      .select(
        "mp_connected, mp_access_token_encrypted, pix_enabled, credit_card_enabled, debit_card_enabled",
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!settings || !settings.mp_connected || !settings.mp_access_token_encrypted) {
      throw new Error("Mercado Pago não está conectado nesta loja");
    }
    if (data.payment_method === "pix_online" && !settings.pix_enabled) {
      throw new Error("Pix Online não está habilitado");
    }
    if (data.payment_method === "credit_card" && !settings.credit_card_enabled) {
      throw new Error("Cartão de crédito online não está habilitado");
    }
    if (data.payment_method === "debit_card" && !settings.debit_card_enabled) {
      throw new Error("Cartão de débito online não está habilitado");
    }

    let accessToken: string;
    try {
      accessToken = await decryptToken(settings.mp_access_token_encrypted);
    } catch (e) {
      console.error("Failed to decrypt MP token:", e);
      throw new Error("Falha ao descriptografar credenciais da loja");
    }

    // 4. Insert pending payment row first (so failures are tracked)
    const { data: paymentRow, error: pErr } = await supabaseAdmin
      .from("payments")
      .insert({
        tenant_id: tenant.id,
        order_id: order.id,
        provider: "mercadopago",
        amount: Number(order.total),
        payment_method: data.payment_method,
        status: "pending",
      })
      .select("id")
      .single();
    if (pErr || !paymentRow) {
      throw new Error(pErr?.message || "Falha ao registrar pagamento");
    }
    const paymentRowId = paymentRow.id as string;

    // 5. Build MP body
    const body: Record<string, unknown> = {
      transaction_amount: Number(order.total),
      description: `Pedido #${order.number} - ${tenant.name}`,
      external_reference: order.id,
      payer: {
        email: data.payer.email,
        first_name: data.payer.first_name,
        last_name: data.payer.last_name,
        ...(data.payer.identification && {
          identification: data.payer.identification,
        }),
      },
    };
    if (data.payment_method === "pix_online") {
      body.payment_method_id = "pix";
    } else {
      if (!data.card_token) {
        await supabaseAdmin
          .from("payments")
          .update({ status: "rejected", status_detail: "missing_card_token" })
          .eq("id", paymentRowId);
        throw new Error("Token do cartão ausente");
      }
      body.token = data.card_token;
      body.installments = data.installments ?? 1;
    }

    // 6. Call Mercado Pago
    let mpJson: MpPaymentResponse;
    let mpStatusOk = false;
    try {
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `order_${order.id}_${data.payment_method}`,
        },
        body: JSON.stringify(body),
      });
      mpStatusOk = mpRes.ok;
      mpJson = (await mpRes.json()) as MpPaymentResponse;
    } catch (err) {
      console.error("MP request failed:", err);
      await supabaseAdmin
        .from("payments")
        .update({
          status: "rejected",
          status_detail: "network_error",
          raw_response: { error: String(err) },
        })
        .eq("id", paymentRowId);
      throw new Error("Falha de rede ao contatar o Mercado Pago");
    }

    if (!mpStatusOk) {
      const cause =
        Array.isArray(mpJson.cause) && mpJson.cause.length
          ? mpJson.cause.map((c) => c.description).filter(Boolean).join("; ")
          : undefined;
      const msg = cause || mpJson.message || mpJson.error || "Erro no gateway";
      await supabaseAdmin
        .from("payments")
        .update({
          status: "rejected",
          status_detail: msg.slice(0, 200),
          raw_response: JSON.parse(JSON.stringify(mpJson)),
        })
        .eq("id", paymentRowId);
      throw new Error(`Mercado Pago: ${msg}`);
    }

    const mappedStatus = mapMpStatus(mpJson.status);
    const mpPaymentId = String(mpJson.id ?? "");

    // 7. Persist payment + order status
    await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: mpPaymentId,
        status: mappedStatus,
        status_detail: mpJson.status_detail ?? null,
        raw_response: JSON.parse(JSON.stringify(mpJson)),
      })
      .eq("id", paymentRowId);

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: mappedStatus,
        mp_payment_id: mpPaymentId,
        mp_status: mpJson.status ?? null,
        mp_status_detail: mpJson.status_detail ?? null,
      })
      .eq("id", order.id);

    if (data.payment_method === "pix_online") {
      const tx = mpJson.point_of_interaction?.transaction_data;
      return {
        type: "pix" as const,
        data: {
          qr_code: tx?.qr_code ?? "",
          qr_code_base64: tx?.qr_code_base64 ?? "",
          ticket_url: tx?.ticket_url,
          expires_at: mpJson.date_of_expiration,
          payment_id: mpPaymentId,
          payment_status: mappedStatus,
        },
      };
    }
    return {
      type: "card" as const,
      data: {
        payment_id: mpPaymentId,
        payment_status: mappedStatus,
        status_detail: mpJson.status_detail ?? undefined,
        order_id: order.id,
      },
    };
  });

const GetPaymentStatusInput = z.object({
  store_slug: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  payment_id: z.string().min(1).max(64),
});

export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetPaymentStatusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.store_slug)
      .eq("active", true)
      .maybeSingle();
    if (!tenant) throw new Error("Loja não encontrada");

    const { data: settings } = await supabaseAdmin
      .from("store_payment_settings")
      .select("mp_access_token_encrypted")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!settings?.mp_access_token_encrypted) {
      return { status: "pending" as const };
    }
    const accessToken = await decryptToken(settings.mp_access_token_encrypted);

    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(data.payment_id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { status: "pending" as const };
    const json = (await res.json()) as MpPaymentResponse & {
      external_reference?: string;
    };
    const mapped = mapMpStatus(json.status);

    // Best-effort sync with our tables
    if (json.external_reference) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: mapped,
          mp_status: json.status ?? null,
          mp_status_detail: json.status_detail ?? null,
        })
        .eq("id", json.external_reference)
        .eq("tenant_id", tenant.id);
      await supabaseAdmin
        .from("payments")
        .update({
          status: mapped,
          status_detail: json.status_detail ?? null,
        })
        .eq("provider_payment_id", String(json.id ?? data.payment_id))
        .eq("tenant_id", tenant.id);
    }

    return { status: mapped, status_detail: json.status_detail };
  });
