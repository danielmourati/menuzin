ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS delivery_km_rounding text NOT NULL DEFAULT 'half',
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision,
  ADD COLUMN IF NOT EXISTS geo_address text;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_delivery_km_rounding_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_delivery_km_rounding_check CHECK (delivery_km_rounding IN ('ceil','half','exact'));