DROP VIEW IF EXISTS public.directory_public;
CREATE VIEW public.directory_public
WITH (security_invoker = off) AS
SELECT p.id AS product_id,
    p.name,
    p.description,
    p.price,
    p.promo_price,
    p.image_url,
    p.directory_category AS category,
    p.directory_featured_until AS featured_until,
    t.id AS tenant_id,
    t.slug AS tenant_slug,
    t.name AS tenant_name,
    t.logo_url AS tenant_logo,
    t.neighborhood,
    t.city,
    t.whatsapp,
    t.plan
   FROM products p
     JOIN tenants t ON t.id = p.tenant_id
  WHERE p.directory_visible = true AND p.available = true AND t.directory_opt_in = true AND t.active = true AND t.status = 'ativa'::tenant_status;

GRANT SELECT ON public.directory_public TO anon, authenticated, service_role;

ALTER TABLE public.guia_promo_requests
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;