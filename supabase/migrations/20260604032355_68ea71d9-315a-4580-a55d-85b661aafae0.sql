DROP POLICY IF EXISTS "payments: anyone inserts for active tenant" ON public.payments;

REVOKE SELECT (mp_access_token_encrypted)
  ON public.store_payment_settings FROM authenticated, anon;