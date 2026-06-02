
-- Add MP tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_status text,
  ADD COLUMN IF NOT EXISTS mp_status_detail text;

CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx ON public.orders(mp_payment_id);

-- Payments log table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_detail text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_tenant_idx ON public.payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_provider_pid_idx ON public.payments(provider_payment_id);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.payments TO anon;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: anyone reads" ON public.payments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "payments: anyone inserts for active tenant" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = payments.tenant_id AND t.active = true));

CREATE POLICY "payments: tenant staff updates" ON public.payments
  FOR UPDATE TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin());

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
