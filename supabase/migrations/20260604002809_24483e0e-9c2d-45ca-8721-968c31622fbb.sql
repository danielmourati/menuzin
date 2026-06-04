CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  neighborhood text NOT NULL,
  fee numeric(10,2) NOT NULL DEFAULT 0,
  min_order_total numeric(10,2) NOT NULL DEFAULT 0,
  estimated_minutes int,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, neighborhood)
);

GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active zones"
  ON public.delivery_zones FOR SELECT
  USING (active = true);

CREATE POLICY "Tenant staff can manage zones"
  ON public.delivery_zones FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[])
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[])
  );

CREATE TRIGGER set_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_delivery_zones_tenant ON public.delivery_zones(tenant_id);