-- 1) Nenhum acesso para visitantes anônimos
REVOKE ALL ON public.store_payment_settings FROM anon;

-- 2) Reaplica grants por coluna para authenticated, excluindo o token criptografado
REVOKE ALL ON public.store_payment_settings FROM authenticated;

GRANT SELECT (
  id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, cash_enabled, pix_manual_enabled,
  card_on_delivery_enabled, pix_enabled, credit_card_enabled, debit_card_enabled,
  pix_manual_key, pix_manual_key_type, pix_manual_receiver, created_at, updated_at
) ON public.store_payment_settings TO authenticated;

GRANT INSERT (
  id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, cash_enabled, pix_manual_enabled,
  card_on_delivery_enabled, pix_enabled, credit_card_enabled, debit_card_enabled,
  pix_manual_key, pix_manual_key_type, pix_manual_receiver, created_at, updated_at
) ON public.store_payment_settings TO authenticated;

GRANT UPDATE (
  provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, cash_enabled, pix_manual_enabled,
  card_on_delivery_enabled, pix_enabled, credit_card_enabled, debit_card_enabled,
  pix_manual_key, pix_manual_key_type, pix_manual_receiver, updated_at
) ON public.store_payment_settings TO authenticated;

GRANT DELETE ON public.store_payment_settings TO authenticated;

-- 3) Service role (servidor) mantém acesso total, inclusive ao token
GRANT ALL ON public.store_payment_settings TO service_role;