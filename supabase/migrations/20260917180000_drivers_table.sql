-- Tabela de Entregadores por Loja
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para buscas rápidas por tenant
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON public.drivers(tenant_id);

-- Atribuição do Entregador na Tabela de Pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS driver_name TEXT;

-- RLS policies para drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de entregadores do tenant" ON public.drivers
  FOR SELECT USING (true);

CREATE POLICY "Permitir escrita de entregadores do tenant" ON public.drivers
  FOR ALL USING (true);
