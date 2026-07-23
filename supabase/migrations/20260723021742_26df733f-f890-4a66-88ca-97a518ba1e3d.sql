
CREATE OR REPLACE FUNCTION public.create_default_subscription_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id INTO v_plan_id FROM public.plans WHERE slug = 'presenca' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, billing_period, amount, grace_days, auto_block_enabled, notes)
  VALUES (NEW.id, v_plan_id, 'ativa', 'mensal', 0, 0, false, 'Criado automaticamente (plano Presença)')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
