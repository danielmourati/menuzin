ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS accepts_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_takeout  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_dinein   boolean NOT NULL DEFAULT true;