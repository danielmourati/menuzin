
-- 1. Free crust mode na products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS free_crust_mode text NOT NULL DEFAULT 'none';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_free_crust_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_free_crust_mode_check
  CHECK (free_crust_mode IN ('none','fixed','customer_choice'));

-- 2. Snapshot da Oferta do Dia
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS offer_original_price numeric,
  ADD COLUMN IF NOT EXISTS offer_fixed_size_id uuid,
  ADD COLUMN IF NOT EXISTS offer_fixed_crust_id uuid,
  ADD COLUMN IF NOT EXISTS offer_included_product_id uuid,
  ADD COLUMN IF NOT EXISTS offer_fixed_flavor_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offer_pieces int,
  ADD COLUMN IF NOT EXISTS offer_max_flavors int;

-- 3. Atualiza validate_category_kind para aceitar 'oferta'
CREATE OR REPLACE FUNCTION public.validate_category_kind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kind NOT IN ('standard', 'pizza', 'oferta') THEN
    RAISE EXCEPTION 'kind inválido: %', NEW.kind;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Tipos de negócio do tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_types text[] NOT NULL DEFAULT '{}';
