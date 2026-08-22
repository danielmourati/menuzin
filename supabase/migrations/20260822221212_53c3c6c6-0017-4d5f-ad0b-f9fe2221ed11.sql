-- Recalcula o preço da solicitação de destaque a partir do plano ativo.
CREATE OR REPLACE FUNCTION public.guia_promo_requests_enforce_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT price INTO v_price
  FROM public.guia_highlight_plans
  WHERE slot_kind = NEW.slot_kind
    AND duration_days = NEW.duration_days
    AND active = true
  ORDER BY sort_order
  LIMIT 1;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Plano de destaque indisponível para % / % dias', NEW.slot_kind, NEW.duration_days;
  END IF;

  -- Valor e status nunca vêm do cliente.
  NEW.amount := v_price;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending_payment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guia_promo_requests_enforce_price ON public.guia_promo_requests;
CREATE TRIGGER guia_promo_requests_enforce_price
BEFORE INSERT ON public.guia_promo_requests
FOR EACH ROW EXECUTE FUNCTION public.guia_promo_requests_enforce_price();

-- Lojista não pode editar valor/tipo/duração/status depois de criada.
CREATE OR REPLACE FUNCTION public.guia_promo_requests_block_tenant_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.slot_kind IS DISTINCT FROM OLD.slot_kind
     OR NEW.duration_days IS DISTINCT FROM OLD.duration_days
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Somente a plataforma pode alterar valor, tipo, duração ou status da solicitação.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guia_promo_requests_block_tenant_update ON public.guia_promo_requests;
CREATE TRIGGER guia_promo_requests_block_tenant_update
BEFORE UPDATE ON public.guia_promo_requests
FOR EACH ROW EXECUTE FUNCTION public.guia_promo_requests_block_tenant_update();