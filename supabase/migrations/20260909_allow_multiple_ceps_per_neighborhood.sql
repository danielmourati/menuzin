-- Remove restrição de unicidade legada (tenant_id, neighborhood) para permitir
-- cadastros do mesmo bairro com faixas de CEPs distintas ou preços diferentes.
ALTER TABLE public.delivery_zones
  DROP CONSTRAINT IF EXISTS delivery_zones_tenant_id_neighborhood_key;
