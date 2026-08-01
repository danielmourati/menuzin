ALTER TABLE public.store_payment_settings
  ADD COLUMN IF NOT EXISTS mp_refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS mp_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_connection_method text NOT NULL DEFAULT 'manual';

REVOKE ALL (mp_refresh_token_encrypted) ON public.store_payment_settings FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.mp_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.mp_oauth_states TO service_role;
ALTER TABLE public.mp_oauth_states ENABLE ROW LEVEL SECURITY;