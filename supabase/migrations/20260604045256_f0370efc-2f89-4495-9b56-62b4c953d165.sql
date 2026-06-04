
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'single'
    CHECK (delivery_mode IN ('none','single','neighborhood'));

ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS cep_start text,
  ADD COLUMN IF NOT EXISTS cep_end text;

ALTER TABLE public.delivery_zones
  ADD CONSTRAINT delivery_zones_cep_start_format CHECK (cep_start IS NULL OR cep_start ~ '^[0-9]{8}$'),
  ADD CONSTRAINT delivery_zones_cep_end_format CHECK (cep_end IS NULL OR cep_end ~ '^[0-9]{8}$'),
  ADD CONSTRAINT delivery_zones_cep_range CHECK (cep_start IS NULL OR cep_end IS NULL OR cep_start <= cep_end);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee_source text
    CHECK (delivery_fee_source IN ('none','single_fee','neighborhood_by_cep','neighborhood_by_name')),
  ADD COLUMN IF NOT EXISTS delivery_neighborhood_snapshot text;

-- Migra tenants existentes: quem já tem bairros cadastrados vai para 'neighborhood'
UPDATE public.tenants t
SET delivery_mode = 'neighborhood'
WHERE EXISTS (SELECT 1 FROM public.delivery_zones z WHERE z.tenant_id = t.id);
