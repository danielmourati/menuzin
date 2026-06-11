ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS free_gift_kind text,
  ADD COLUMN IF NOT EXISTS free_gift_ref_id uuid;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_free_gift_kind_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_free_gift_kind_check
  CHECK (free_gift_kind IS NULL OR free_gift_kind IN ('crust','product'));