ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS delivery_time_min integer,
  ADD COLUMN IF NOT EXISTS delivery_time_max integer,
  ADD COLUMN IF NOT EXISTS takeout_time_min integer,
  ADD COLUMN IF NOT EXISTS takeout_time_max integer;