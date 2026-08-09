-- 1) slug em products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

-- helper sem depender da extensão unaccent
CREATE OR REPLACE FUNCTION public.unaccent_fallback(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    coalesce(_txt, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent_fallback(_txt)),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.products_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := public.slugify(NEW.name);
  IF base IS NULL OR base = '' THEN
    base := 'item';
  END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.tenant_id = NEW.tenant_id
      AND p.slug = candidate
      AND p.id IS DISTINCT FROM NEW.id
  ) LOOP
    i := i + 1;
    candidate := base || '-' || i;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_slug ON public.products;
CREATE TRIGGER products_set_slug
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_set_slug();

-- backfill
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  i int;
BEGIN
  FOR r IN SELECT id, tenant_id, name FROM public.products WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base := public.slugify(r.name);
    IF base IS NULL OR base = '' THEN base := 'item'; END IF;
    candidate := base;
    i := 1;
    WHILE EXISTS (SELECT 1 FROM public.products p WHERE p.tenant_id = r.tenant_id AND p.slug = candidate) LOOP
      i := i + 1;
      candidate := base || '-' || i;
    END LOOP;
    UPDATE public.products SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_slug_uidx ON public.products (tenant_id, slug);

-- 2) link do produto nas solicitações de destaque
ALTER TABLE public.guia_promo_requests
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS product_href text;