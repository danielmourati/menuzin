CREATE TABLE public.store_payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'mercadopago',
  mp_public_key text,
  mp_access_token_encrypted text,
  mp_user_id text,
  mp_live_mode boolean NOT NULL DEFAULT false,
  mp_connected boolean NOT NULL DEFAULT false,
  mp_last_validated_at timestamptz,
  cash_enabled boolean NOT NULL DEFAULT true,
  pix_manual_enabled boolean NOT NULL DEFAULT true,
  card_on_delivery_enabled boolean NOT NULL DEFAULT true,
  pix_enabled boolean NOT NULL DEFAULT false,
  credit_card_enabled boolean NOT NULL DEFAULT false,
  debit_card_enabled boolean NOT NULL DEFAULT false,
  pix_manual_key text,
  pix_manual_key_type text,
  pix_manual_receiver text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payment_settings TO authenticated;
GRANT ALL ON public.store_payment_settings TO service_role;

ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_payment_settings: tenant owners read"
ON public.store_payment_settings
FOR SELECT
TO authenticated
USING (
  has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_platform_admin()
);

CREATE POLICY "store_payment_settings: tenant owners insert"
ON public.store_payment_settings
FOR INSERT
TO authenticated
WITH CHECK (
  has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_platform_admin()
);

CREATE POLICY "store_payment_settings: tenant owners update"
ON public.store_payment_settings
FOR UPDATE
TO authenticated
USING (
  has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_platform_admin()
)
WITH CHECK (
  has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_platform_admin()
);

CREATE POLICY "store_payment_settings: tenant owners delete"
ON public.store_payment_settings
FOR DELETE
TO authenticated
USING (
  has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
  OR is_platform_admin()
);

CREATE TRIGGER update_store_payment_settings_updated_at
BEFORE UPDATE ON public.store_payment_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
