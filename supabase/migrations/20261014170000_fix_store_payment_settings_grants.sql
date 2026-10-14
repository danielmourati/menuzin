-- ============================================================
-- Migration: 20261014170000_fix_store_payment_settings_grants.sql
-- Garante permissões adequadas em store_payment_settings para authenticated,
-- incluindo as colunas cash_accepts_100 e cash_accepts_200 e INSERT/UPDATE/SELECT,
-- mantendo os tokens criptografados acessíveis exclusivamente pelo service_role.
-- ============================================================

-- 1) Revoga tokens para anon e authenticated
REVOKE ALL (mp_access_token_encrypted, mp_refresh_token_encrypted) ON public.store_payment_settings FROM anon, authenticated;

-- 2) Garante SELECT em todas as colunas públicas/seguras
GRANT SELECT (
  id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, mp_connection_method, mp_token_expires_at,
  cash_enabled, cash_accepts_100, cash_accepts_200, pix_manual_enabled, card_on_delivery_enabled,
  pix_enabled, credit_card_enabled, debit_card_enabled, pix_manual_key,
  pix_manual_key_type, pix_manual_receiver, created_at, updated_at
) ON public.store_payment_settings TO authenticated;

-- 3) Garante INSERT em todas as colunas públicas/seguras
GRANT INSERT (
  id, tenant_id, provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, mp_connection_method, mp_token_expires_at,
  cash_enabled, cash_accepts_100, cash_accepts_200, pix_manual_enabled, card_on_delivery_enabled,
  pix_enabled, credit_card_enabled, debit_card_enabled, pix_manual_key,
  pix_manual_key_type, pix_manual_receiver, created_at, updated_at
) ON public.store_payment_settings TO authenticated;

-- 4) Garante UPDATE em todas as colunas públicas/seguras
GRANT UPDATE (
  provider, mp_public_key, mp_user_id, mp_live_mode, mp_connected,
  mp_last_validated_at, mp_account_kind, mp_connection_method, mp_token_expires_at,
  cash_enabled, cash_accepts_100, cash_accepts_200, pix_manual_enabled, card_on_delivery_enabled,
  pix_enabled, credit_card_enabled, debit_card_enabled, pix_manual_key,
  pix_manual_key_type, pix_manual_receiver, updated_at
) ON public.store_payment_settings TO authenticated;

-- 5) Service role mantém acesso irrestrito
GRANT ALL ON public.store_payment_settings TO service_role;
