
-- Backfill de assinaturas Presença para tenants sem tenant_subscriptions
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, billing_period, amount, grace_days, auto_block_enabled, notes)
SELECT t.id, p.id, 'ativa', 'mensal', 0, 0, false, 'Criado automaticamente (plano Presença)'
FROM public.tenants t
CROSS JOIN LATERAL (SELECT id FROM public.plans WHERE slug='presenca' LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_subscriptions s WHERE s.tenant_id = t.id);

-- Função + trigger: cria assinatura Presença automaticamente para novos tenants
CREATE OR REPLACE FUNCTION public.create_default_subscription_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_tenant_default_subscription ON public.tenants;
CREATE TRIGGER trg_tenant_default_subscription
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription_for_tenant();
