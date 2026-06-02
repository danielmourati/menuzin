// ============================================================
// Menuzin — Payment Service (client wrapper around server fns)
// ============================================================
import {
  getPaymentSettings as _getPaymentSettings,
  saveMpCredentials as _saveMpCredentials,
  disconnectMercadoPago as _disconnectMercadoPago,
  updatePaymentSettings as _updatePaymentSettings,
  getPublicPaymentSettingsBySlug as _getPublicPaymentSettingsBySlug,
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
  _slug: string,
): Promise<StorePaymentSettingsSafe | null> {
  // Public read by slug — to be implemented when checkout transparente is built.
  return null;
}

export async function createPixPayment(
  _params: Extract<CreatePaymentRequest, { payment_method: "pix_online" }>,
): Promise<Extract<CreatePaymentResponse, { type: "pix" }>> {
  throw new Error("Checkout transparente ainda não implementado.");
}

export async function createCardPayment(
  _params: Extract<CreatePaymentRequest, { payment_method: "credit_card" | "debit_card" }>,
): Promise<Extract<CreatePaymentResponse, { type: "card" }>> {
  throw new Error("Checkout transparente ainda não implementado.");
}

export async function testPayment(_storeId?: string): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Teste de pagamento será habilitado quando o checkout transparente estiver pronto.",
  };
}

export async function pollPaymentStatus(
  _paymentId: string,
  _attempt = 0,
): Promise<PaymentStatus> {
  return "pending";
}

// Re-export PixPaymentData / CardPaymentData for components that import from here
export type { PixPaymentData, CardPaymentData };
