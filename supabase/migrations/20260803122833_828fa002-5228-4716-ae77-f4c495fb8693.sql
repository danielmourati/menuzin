CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  device_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_cep text,
  last_city text,
  last_uf text,
  last_neighborhood text,
  last_address jsonb,
  orders_count integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view customers" ON public.customers
  FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE INDEX idx_customers_phone ON public.customers (phone);

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text,
  cep text,
  street text,
  number text,
  neighborhood text,
  complement text,
  reference text,
  city text,
  uf text,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view customer addresses" ON public.customer_addresses
  FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE INDEX idx_customer_addresses_customer ON public.customer_addresses (customer_id);

CREATE TRIGGER customer_addresses_set_updated_at BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_customer ON public.orders (customer_id);