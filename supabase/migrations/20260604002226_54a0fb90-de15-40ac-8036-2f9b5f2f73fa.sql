
CREATE TYPE public.coupon_discount_type AS ENUM ('fixed', 'percent');

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type public.coupon_discount_type NOT NULL,
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_total numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX coupons_tenant_active_idx ON public.coupons (tenant_id, active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons: tenant staff reads"
  ON public.coupons FOR SELECT TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
    OR public.is_platform_admin()
  );

CREATE POLICY "coupons: tenant staff inserts"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
    OR public.is_platform_admin()
  );

CREATE POLICY "coupons: tenant staff updates"
  ON public.coupons FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
    OR public.is_platform_admin()
  );

CREATE POLICY "coupons: tenant staff deletes"
  ON public.coupons FOR DELETE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role, 'admin'::app_role])
    OR public.is_platform_admin()
  );

CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0;
