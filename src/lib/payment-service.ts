// ============================================================
// Menuzin — Payment Service (Mock Implementation)
// Same interface as Supabase Edge Functions — swap when ready
// ============================================================

import type {
  StorePaymentSettingsSafe,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PixPaymentData,
  CardPaymentData,
  MpConnectStartResponse,
  PaymentStatus,
  SaveMpCredentialsResponse,
} from "./payment-types";

/** Mask a public key for display: APP_USR-1234-abcd → APP_USR-****-abcd */
function maskKey(key: string): string {
  const parts = key.split("-");
  if (parts.length >= 4) {
    return parts.map((p, i) => (i === 1 || i === 2 ? "****" : p)).join("-");
  }
  return key.slice(0, 8) + "****" + key.slice(-4);
}

// ---- Mock Store Payment Settings per tenant ----

const mockSettings: Record<string, StorePaymentSettingsSafe> = {
  "t1": {
    id: "ps1",
    store_id: "t1",
    provider: "mercadopago",
    mp_user_id: "123456789",
    mp_public_key: "TEST-abc123-public-key",
    mp_connected: true,
    mp_live_mode: false,
    mp_token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    cash_enabled: true,
    pix_manual_enabled: true,
    card_on_delivery_enabled: true,
    pix_manual_key: "pix@burgerprime.com.br",
    pix_manual_key_type: "email",
    pix_manual_receiver: "Burger Prime LTDA",
    pix_enabled: true,
    credit_card_enabled: true,
    debit_card_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "t2": {
    id: "ps2",
    store_id: "t2",
    provider: "mercadopago",
    mp_connected: false,
    mp_live_mode: false,
    cash_enabled: true,
    pix_manual_enabled: true,
    card_on_delivery_enabled: true,
    pix_manual_key: "pix@pizzarianapoli.com",
    pix_manual_key_type: "email",
    pix_manual_receiver: "Pizzaria Napoli LTDA",
    pix_enabled: false,
    credit_card_enabled: false,
    debit_card_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "t3": {
    id: "ps3",
    store_id: "t3",
    provider: "mercadopago",
    mp_connected: false,
    mp_live_mode: false,
    cash_enabled: true,
    pix_manual_enabled: true,
    card_on_delivery_enabled: false,
    pix_enabled: false,
    credit_card_enabled: false,
    debit_card_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "t4": {
    id: "ps4",
    store_id: "t4",
    provider: "mercadopago",
    mp_connected: false,
    mp_live_mode: false,
    cash_enabled: true,
    pix_manual_enabled: true,
    card_on_delivery_enabled: true,
    pix_enabled: false,
    credit_card_enabled: false,
    debit_card_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// In-memory store for mock state changes
const localSettings: Record<string, StorePaymentSettingsSafe> = { ...mockSettings };

// Simulate network delay
const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

// ---- Service Functions ----

/** Get payment settings for a store (safe — no tokens) */
export async function getStorePaymentSettings(
  storeId: string
): Promise<StorePaymentSettingsSafe | null> {
  await delay(400);
  return localSettings[storeId] ?? null;
}

/** Get payment settings by slug (resolves store_id internally) */
export async function getPaymentSettingsBySlug(
  slug: string
): Promise<StorePaymentSettingsSafe | null> {
  await delay(400);
  const slugToId: Record<string, string> = {
    "burger-prime": "t1",
    "pizzaria-napoli": "t2",
    "acai-tropical": "t3",
    "cafe-aurora": "t4",
  };
  const storeId = slugToId[slug];
  if (!storeId) return null;
  return localSettings[storeId] ?? null;
}

/** Start Mercado Pago OAuth flow */
export async function connectMercadoPago(
  storeId: string
): Promise<MpConnectStartResponse> {
  await delay(600);
  // In real implementation, this calls the mp-connect-start Edge Function
  // which generates a real OAuth URL
  const mockAuthUrl = `https://auth.mercadopago.com.br/authorization?client_id=DEMO&response_type=code&state=${btoa(storeId)}&redirect_uri=${encodeURIComponent(window.location.origin + "/api/mp-oauth-callback")}`;
  return { authorization_url: mockAuthUrl };
}

/** Simulate completing OAuth (mock — in production, callback handles this) */
export async function simulateMpConnectSuccess(storeId: string): Promise<void> {
  await delay(1200);
  localSettings[storeId] = {
    ...localSettings[storeId],
    mp_connected: true,
    mp_user_id: `mp_user_${Date.now()}`,
    mp_public_key: `TEST-${Math.random().toString(36).slice(2)}-public`,
    mp_token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    pix_enabled: true,
    credit_card_enabled: true,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Save manual Mercado Pago credentials (Public Key + Access Token).
 * In production, this calls the `mp-save-credentials` Edge Function which
 * encrypts the Access Token server-side before storing it.
 */
export async function saveMpCredentials(
  storeId: string,
  mpPublicKey: string,
  mpAccessToken: string,
  mpLiveMode: boolean
): Promise<SaveMpCredentialsResponse> {
  // Basic client-side format validation
  const validPrefixes = ["APP_USR-", "TEST-"];
  const isValidKey = validPrefixes.some((p) => mpPublicKey.startsWith(p));
  const isValidToken = validPrefixes.some((p) => mpAccessToken.startsWith(p));

  if (!isValidKey || !isValidToken) {
    return {
      success: false,
      message:
        "Credenciais inválidas. A Public Key e o Access Token devem começar com APP_USR- (Produção) ou TEST- (Sandbox).",
    };
  }

  await delay(900);

  // Update in-memory settings (mock; real implementation: edge function → DB)
  localSettings[storeId] = {
    ...localSettings[storeId],
    mp_connected: true,
    mp_public_key: mpPublicKey,
    mp_live_mode: mpLiveMode,
    mp_token_expires_at: undefined, // Manual credentials don't expire via refresh token
    pix_enabled: true,
    credit_card_enabled: true,
    debit_card_enabled: false,
    updated_at: new Date().toISOString(),
  };

  return {
    success: true,
    message: "Credenciais salvas com sucesso! Mercado Pago conectado.",
    mp_public_key_masked: maskKey(mpPublicKey),
  };
}

/** Disconnect Mercado Pago */
export async function disconnectMercadoPago(storeId: string): Promise<void> {
  await delay(600);
  localSettings[storeId] = {
    ...localSettings[storeId],
    mp_connected: false,
    mp_user_id: undefined,
    mp_public_key: undefined,
    mp_token_expires_at: undefined,
    pix_enabled: false,
    credit_card_enabled: false,
    debit_card_enabled: false,
    updated_at: new Date().toISOString(),
  };
}

/** Update individual payment settings */
export async function updatePaymentSettings(
  storeId: string,
  patch: Partial<StorePaymentSettingsSafe>
): Promise<StorePaymentSettingsSafe> {
  await delay(400);
  localSettings[storeId] = {
    ...localSettings[storeId],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  return localSettings[storeId];
}

/** Create a Pix payment (mock) */
export async function createPixPayment(
  params: Extract<CreatePaymentRequest, { payment_method: "pix_online" }>
): Promise<Extract<CreatePaymentResponse, { type: "pix" }>> {
  await delay(1000);

  // Mock Pix QR code data
  const fakePixCode = `00020126580014BR.GOV.BCB.PIX0136${params.store_slug.toUpperCase()}${Date.now()}5204000053039865802BR5925MENUZIN PAGAMENTOS LTDA6009SAO PAULO62070503***63046CA3`;

  const pixData: PixPaymentData = {
    qr_code: fakePixCode,
    qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    ticket_url: "https://www.mercadopago.com.br/payments/123456/ticket",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
    payment_id: `PIX_${Date.now()}`,
    payment_status: "pending",
  };

  return { type: "pix", data: pixData };
}

/** Create a card payment (mock) */
export async function createCardPayment(
  params: Extract<CreatePaymentRequest, { payment_method: "credit_card" | "debit_card" }>
): Promise<Extract<CreatePaymentResponse, { type: "card" }>> {
  await delay(1500);

  // Simulate approval/rejection based on last card digit (mock)
  const status: PaymentStatus = "approved";

  const cardData: CardPaymentData = {
    payment_id: `CARD_${Date.now()}`,
    payment_status: status,
    status_detail: "accredited",
    order_id: params.order_id,
  };

  return { type: "card", data: cardData };
}

/** Test payment (fires a R$0.01 test transaction) */
export async function testPayment(storeId: string): Promise<{ success: boolean; message: string }> {
  await delay(1500);
  const settings = localSettings[storeId];
  if (!settings?.mp_connected) {
    return { success: false, message: "Mercado Pago não está conectado." };
  }
  return {
    success: true,
    message: "Pagamento de teste processado com sucesso! Verifique sua conta Mercado Pago.",
  };
}

/** Poll payment status (for Pix waiting screen) */
export async function pollPaymentStatus(
  paymentId: string,
  attempt = 0
): Promise<PaymentStatus> {
  await delay(2000);
  // Mock: after 3 polls, simulate approval
  if (attempt >= 3) return "approved";
  return "pending";
}
