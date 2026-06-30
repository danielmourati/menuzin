ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listed_as_flavor BOOLEAN;

UPDATE public.products p
SET listed_as_flavor = true
WHERE listed_as_flavor IS NULL
  AND category_id IN (SELECT id FROM public.categories WHERE kind = 'pizza');