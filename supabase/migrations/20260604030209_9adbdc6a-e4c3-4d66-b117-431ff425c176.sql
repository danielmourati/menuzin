ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS hours_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS open_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_open_mode_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_open_mode_check CHECK (open_mode IN ('auto','open','closed'));