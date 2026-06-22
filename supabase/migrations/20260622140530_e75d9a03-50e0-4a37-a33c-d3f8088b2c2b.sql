
CREATE TABLE public.order_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone text,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  nps smallint CHECK (nps IS NULL OR (nps BETWEEN 0 AND 10)),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_ratings_order_unique UNIQUE (order_id)
);

CREATE INDEX order_ratings_tenant_idx ON public.order_ratings(tenant_id, created_at DESC);

GRANT SELECT ON public.order_ratings TO authenticated;
GRANT ALL ON public.order_ratings TO service_role;

ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant team can read ratings"
  ON public.order_ratings
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  );

CREATE TRIGGER set_order_ratings_updated_at
  BEFORE UPDATE ON public.order_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
