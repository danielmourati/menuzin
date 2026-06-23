
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM
    ('ativa','pendente','vencida','tolerancia','bloqueada','cancelada','teste','cortesia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_billing_period AS ENUM
    ('mensal','trimestral','semestral','anual','personalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_payment_status AS ENUM
    ('pending','approved','rejected','cancelled','refunded','expired','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  annual_price numeric(10,2),
  billing_periods public.subscription_billing_period[] NOT NULL DEFAULT '{mensal}',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_read_all ON public.plans FOR SELECT USING (true);
CREATE POLICY plans_admin_write ON public.plans FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'pendente',
  billing_period public.subscription_billing_period NOT NULL DEFAULT 'mensal',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT (now()::date),
  due_date date,
  grace_days integer NOT NULL DEFAULT 3,
  auto_block_enabled boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  unblocked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenant_subscriptions TO authenticated;
GRANT ALL ON public.tenant_subscriptions TO service_role;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tsub_read_tenant ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  );
CREATE POLICY tsub_admin_all ON public.tenant_subscriptions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER tsub_set_updated_at BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  amount numeric(10,2) NOT NULL,
  billing_period public.subscription_billing_period NOT NULL,
  reference_month date,
  due_date date,
  paid_at timestamptz,
  payment_status public.subscription_payment_status NOT NULL DEFAULT 'pending',
  mercado_pago_payment_id text UNIQUE,
  mercado_pago_preference_id text,
  mercado_pago_external_reference text,
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_ticket_url text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_payments_tenant ON public.subscription_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_sub ON public.subscription_payments(subscription_id);
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY spay_read_tenant ON public.subscription_payments FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  );
CREATE POLICY spay_admin_all ON public.subscription_payments FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER spay_set_updated_at BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_events_tenant ON public.subscription_events(tenant_id);
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sevt_read_tenant ON public.subscription_events FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  );
CREATE POLICY sevt_admin_all ON public.subscription_events FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.plans (slug, name, description, monthly_price, annual_price, billing_periods, features, sort_order)
VALUES
  ('start','Start','Plano básico para começar',0,NULL,
    ARRAY['mensal']::public.subscription_billing_period[],
    '["Produtos ilimitados","Dashboard completo","Status de pedidos","Pedidos no WhatsApp","Relatórios gerenciais básicos"]'::jsonb,
    1),
  ('pro','Pro','Recursos avançados para crescer',79,790,
    ARRAY['mensal','trimestral','semestral','anual']::public.subscription_billing_period[],
    '["Tudo do Start","Pagamento online via Mercado Pago","Múltiplas impressoras","Suporte humano via WhatsApp","Cupom de cozinha"]'::jsonb,
    2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, billing_period, amount, start_date, due_date, grace_days, auto_block_enabled)
SELECT
  t.id,
  COALESCE(
    (SELECT id FROM public.plans WHERE slug = NULLIF(t.plan,'') LIMIT 1),
    (SELECT id FROM public.plans WHERE slug = 'start' LIMIT 1)
  ),
  'cortesia'::public.subscription_status,
  'mensal'::public.subscription_billing_period,
  0, now()::date, NULL, 3, false
FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_subscriptions s WHERE s.tenant_id = t.id);
