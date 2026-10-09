ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS no_change boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_payment_settings ADD COLUMN IF NOT EXISTS cash_accepts_100 boolean NOT NULL DEFAULT true;
ALTER TABLE public.store_payment_settings ADD COLUMN IF NOT EXISTS cash_accepts_200 boolean NOT NULL DEFAULT true;

CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opened_by uuid,
  opened_by_name text,
  opening_float numeric NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid,
  counted_amount numeric,
  expected_amount numeric,
  cash_sales numeric,
  withdrawals_total numeric,
  difference numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cash_sessions_one_open ON public.cash_sessions(tenant_id) WHERE status = 'open';
CREATE INDEX cash_sessions_tenant_idx ON public.cash_sessions(tenant_id, opened_at DESC);
GRANT SELECT ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant staff read cash sessions" ON public.cash_sessions FOR SELECT TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[]) OR public.is_platform_admin());

CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'sangria' CHECK (kind IN ('sangria')),
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cash_movements_session_idx ON public.cash_movements(session_id);
GRANT SELECT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant staff read cash movements" ON public.cash_movements FOR SELECT TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[]) OR public.is_platform_admin());

CREATE TABLE public.cash_driver_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  driver_id uuid,
  driver_name text,
  amount numeric NOT NULL DEFAULT 0,
  settled_by uuid,
  settled_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cash_driver_settlements_unique ON public.cash_driver_settlements(session_id, driver_id);
GRANT SELECT ON public.cash_driver_settlements TO authenticated;
GRANT ALL ON public.cash_driver_settlements TO service_role;
ALTER TABLE public.cash_driver_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant staff read driver settlements" ON public.cash_driver_settlements FOR SELECT TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[]) OR public.is_platform_admin());