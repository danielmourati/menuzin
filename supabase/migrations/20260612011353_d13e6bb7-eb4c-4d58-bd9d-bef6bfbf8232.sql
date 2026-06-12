ALTER TABLE public.addon_groups ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bestseller boolean NOT NULL DEFAULT false;