
-- 1) Tenants: bairro, cep, opt-in
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS directory_opt_in boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tenants_neighborhood_idx
  ON public.tenants (neighborhood)
  WHERE directory_opt_in = true;

-- 2) Products: publicação no Guia
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS directory_category text,
  ADD COLUMN IF NOT EXISTS directory_featured_until timestamptz;

CREATE INDEX IF NOT EXISTS products_directory_category_idx
  ON public.products (directory_category)
  WHERE directory_visible = true;

CREATE INDEX IF NOT EXISTS products_directory_featured_idx
  ON public.products (directory_featured_until)
  WHERE directory_featured_until IS NOT NULL;

-- 3) Clicks (analytics anônima)
CREATE TABLE IF NOT EXISTS public.directory_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  neighborhood text,
  category text,
  destination text NOT NULL CHECK (destination IN ('whatsapp','storefront')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.directory_clicks TO anon, authenticated;
GRANT SELECT ON public.directory_clicks TO authenticated;
GRANT ALL ON public.directory_clicks TO service_role;

ALTER TABLE public.directory_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert directory clicks"
  ON public.directory_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "tenant reads own directory clicks"
  ON public.directory_clicks FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE INDEX IF NOT EXISTS directory_clicks_tenant_time_idx
  ON public.directory_clicks (tenant_id, created_at DESC);

-- 4) View pública do diretório (security definer via owner postgres)
DROP VIEW IF EXISTS public.directory_public;

CREATE VIEW public.directory_public AS
SELECT
  p.id                       AS product_id,
  p.name,
  p.description,
  p.price,
  p.promo_price,
  p.image_url,
  p.directory_category       AS category,
  p.directory_featured_until AS featured_until,
  t.id      AS tenant_id,
  t.slug    AS tenant_slug,
  t.name    AS tenant_name,
  t.logo_url AS tenant_logo,
  t.neighborhood,
  t.city,
  t.whatsapp
FROM public.products p
JOIN public.tenants t ON t.id = p.tenant_id
WHERE p.directory_visible = true
  AND p.available = true
  AND t.directory_opt_in = true
  AND t.active = true
  AND t.status = 'ativa';

-- Owner postgres + security_invoker=off para permitir leitura anônima sem RLS bloquear
ALTER VIEW public.directory_public OWNER TO postgres;
ALTER VIEW public.directory_public SET (security_invoker = off);

GRANT SELECT ON public.directory_public TO anon, authenticated;
