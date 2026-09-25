ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS delivery_base_km numeric,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_km numeric,
  ADD COLUMN IF NOT EXISTS delivery_max_km numeric;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_delivery_mode_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_delivery_mode_check CHECK (delivery_mode IN ('none','single','neighborhood','km'));