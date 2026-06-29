
ALTER TABLE public.category_pizza_sizes
  ADD COLUMN IF NOT EXISTS price_rule TEXT NOT NULL DEFAULT 'sum_fractions';

DO $$ BEGIN
  ALTER TABLE public.category_pizza_sizes
    ADD CONSTRAINT category_pizza_sizes_price_rule_chk
    CHECK (price_rule IN ('sum_fractions','max_value','fixed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS fraction_prices JSONB;

UPDATE public.product_sizes
  SET fraction_prices = jsonb_build_object('1', price)
  WHERE fraction_prices IS NULL;
