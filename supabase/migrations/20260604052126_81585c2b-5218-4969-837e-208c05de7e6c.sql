ALTER TABLE public.cep_ranges ADD COLUMN IF NOT EXISTS neighborhood text NULL;
CREATE INDEX IF NOT EXISTS cep_ranges_neighborhood_lower_idx ON public.cep_ranges (lower(neighborhood));