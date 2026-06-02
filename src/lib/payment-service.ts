// ============================================================
// Menuzin — Payment Service (client wrapper around server fns)
// ============================================================
import {
  getPaymentSettings as _getPaymentSettings,
  saveMpCredentials as _saveMpCredentials,
  disconnectMercadoPago as _disconnectMercadoPago,
  updatePaymentSettings as _updatePaymentSettings,
  getPublicPaymentSettingsBySlug as _getPublicPaymentSettingsBySlug,
  createTransparentPayment as _createTransparentPayment,
  getPaymentStatus as _getPaymentStatus,
  testMpCredentials as _testMpCredentials,
} from "./payments.functions";

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

/** Get payment settings for the authenticated tenant (storeId arg ignored). */
export async function getStorePaymentSettings(
  _storeId?: string,
): Promise<StorePaymentSettingsSafe | null> {
  return _getPaymentSettings();
}

/** Save manual Mercado Pago credentials — validates against MP /users/me. */
export async function saveMpCredentials(
  _storeId: string | undefined,
  mpPublicKey: string,
  mpAccessToken: string,
  mpLiveMode: boolean,
): Promise<SaveMpCredentialsResponse> {
  const res = await _saveMpCredentials({
    data: {
      mp_public_key: mpPublicKey,
      mp_access_token: mpAccessToken,
      mp_live_mode: mpLiveMode,
    },
  });
  return {
    success: res.success,
    message: res.message,
    mp_public_key_masked: "mp_public_key_masked" in res ? res.mp_public_key_masked : undefined,
  };
}

export async function disconnectMercadoPago(_storeId?: string): Promise<void> {
  await _disconnectMercadoPago();
}

export async function updatePaymentSettings(
  _storeId: string | undefined,
  patch: Partial<StorePaymentSettingsSafe>,
): Promise<StorePaymentSettingsSafe> {
  // Only forward safe fields
  const { cash_enabled, pix_manual_enabled, card_on_delivery_enabled,
    pix_enabled, credit_card_enabled, debit_card_enabled,
    pix_manual_key, pix_manual_key_type, pix_manual_receiver } = patch;
  return _updatePaymentSettings({
    data: {
      cash_enabled, pix_manual_enabled, card_on_delivery_enabled,
      pix_enabled, credit_card_enabled, debit_card_enabled,
      pix_manual_key, pix_manual_key_type, pix_manual_receiver,
    },
  });
}

// ---------- OAuth / Checkout (still mock — implemented in later phases) ----------

export async function connectMercadoPago(_storeId?: string): Promise<MpConnectStartResponse> {
  throw new Error("Conexão OAuth ainda não implementada. Use credenciais manuais por enquanto.");
}

export async function simulateMpConnectSuccess(_storeId?: string): Promise<void> {
  throw new Error("Não implementado.");
}

export async function getPaymentSettingsBySlug(
  slug: string,
): Promise<StorePaymentSettingsSafe | null> {
  return _getPublicPaymentSettingsBySlug({ data: { slug } });
}

export async function createPixPayment(
  params: Extract<CreatePaymentRequest, { payment_method: "pix_online" }>,
): Promise<Extract<CreatePaymentResponse, { type: "pix" }>> {
  const res = await _createTransparentPayment({
    data: {
      store_slug: params.store_slug,
      order_id: params.order_id,
      payment_method: "pix_online",
      payer: params.payer,
    },
  });
  if (res.type !== "pix") throw new Error("Resposta inesperada do gateway");
  return res as Extract<CreatePaymentResponse, { type: "pix" }>;
}

export async function createCardPayment(
  params: Extract<CreatePaymentRequest, { payment_method: "credit_card" | "debit_card" }>,
): Promise<Extract<CreatePaymentResponse, { type: "card" }>> {
  const res = await _createTransparentPayment({
    data: {
      store_slug: params.store_slug,
      order_id: params.order_id,
      payment_method: params.payment_method,
      card_token: params.card_token,
      installments: params.installments,
      payer: params.payer,
    },
  });
  if (res.type !== "card") throw new Error("Resposta inesperada do gateway");
  return res as Extract<CreatePaymentResponse, { type: "card" }>;
}

export async function testPayment(_storeId?: string): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Use o checkout público para testar pagamentos reais.",
  };
}

export async function pollPaymentStatus(
  paymentId: string,
  _attempt = 0,
  storeSlug?: string,
): Promise<PaymentStatus> {
  if (!storeSlug) return "pending";
  try {
    const res = await _getPaymentStatus({
      data: { store_slug: storeSlug, payment_id: paymentId },
    });
    return res.status as PaymentStatus;
  } catch {
    return "pending";
  }
}

// Re-export PixPaymentData / CardPaymentData for components that import from here
export type { PixPaymentData, CardPaymentData };
