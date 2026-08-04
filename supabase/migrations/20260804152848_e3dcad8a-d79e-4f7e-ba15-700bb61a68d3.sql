REVOKE SELECT ON public.store_payment_settings FROM authenticated;
REVOKE SELECT ON public.store_payment_settings FROM anon;

GRANT SELECT (
  id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, cash_enabled, pix_manual_enabled, card_on_delivery_enabled,
  pix_enabled, credit_card_enabled, debit_card_enabled, pix_manual_key,
  pix_manual_key_type, pix_manual_receiver, created_at, updated_at,
  mp_account_kind, mp_token_expires_at, mp_connection_method
) ON public.store_payment_settings TO authenticated;

REVOKE UPDATE ON public.store_payment_settings FROM authenticated;
GRANT UPDATE (
  provider, mp_public_key, mp_live_mode, mp_connected, cash_enabled,
  pix_manual_enabled, card_on_delivery_enabled, pix_enabled, credit_card_enabled,
  debit_card_enabled, pix_manual_key, pix_manual_key_type, pix_manual_receiver,
  mp_account_kind, mp_connection_method, updated_at
) ON public.store_payment_settings TO authenticated;

GRANT ALL ON public.store_payment_settings TO service_role;