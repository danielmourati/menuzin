ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS delivery_free_km numeric NOT NULL DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS delivery_fee_customer_pct numeric NOT NULL DEFAULT 100;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_full numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_store_share numeric NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.validate_tenant_delivery_split()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.delivery_fee_customer_pct < 0 OR NEW.delivery_fee_customer_pct > 100 THEN
    RAISE EXCEPTION 'Percentual da taxa deve estar entre 0 e 100';
  END IF;
  IF NEW.delivery_free_km < 0 THEN
    RAISE EXCEPTION 'KM grátis inválido';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_tenant_delivery_split BEFORE INSERT OR UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_delivery_split();