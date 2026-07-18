
-- 1. Rename existing 'start' plan (which is free R$0) to 'presenca'.
UPDATE public.plans
SET slug = 'presenca',
    name = 'Presença',
    description = 'Presença no Guia Menuzin com cardápio básico.',
    monthly_price = 0,
    annual_price = NULL,
    features = '["Página no Guia Menuzin","Até 20 produtos","Até 4 categorias","QR Code e link público","Botão de WhatsApp","Estatísticas básicas","Marca Menuzin"]'::jsonb,
    sort_order = 1
WHERE slug = 'start';

-- 2. Update Pro plan with new price and features.
UPDATE public.plans
SET name = 'Pro',
    description = 'Automação completa, pagamento online e destaque no Guia.',
    monthly_price = 127.90,
    annual_price = 1279.00,
    features = '["Tudo do Start","Pedidos ilimitados","Pagamento online (Mercado Pago)","Impressão automática (cozinha + entrega)","Adicionais avançados e combos","Pizza com múltiplos sabores","Cupons avançados e upsell","Taxa de entrega por distância","Relatórios completos","Recuperação de clientes","Múltiplos usuários","Destaque no Guia","Suporte prioritário"]'::jsonb,
    sort_order = 3,
    billing_periods = ARRAY['mensal','trimestral','semestral','anual']::public.subscription_billing_period[]
WHERE slug = 'pro';

-- 3. Insert new paid Start plan (between Presença e Pro).
INSERT INTO public.plans (slug, name, description, monthly_price, annual_price, billing_periods, features, sort_order, active)
VALUES (
  'start',
  'Start',
  'Pedidos organizados no painel, para começar a vender.',
  57.90,
  579.00,
  ARRAY['mensal','trimestral','semestral','anual']::public.subscription_billing_period[],
  '["Tudo do Presença","Produtos e categorias ilimitados","Painel de pedidos","Pedidos entrega e retirada","Status do pedido","Cadastro de clientes","Adicionais simples","Taxa fixa por bairro","Cupons básicos","Impressão manual","Relatórios básicos","Até 2 usuários"]'::jsonb,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  billing_periods = EXCLUDED.billing_periods,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- 4. Add limits jsonb column to plans for programmatic gating.
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.plans SET limits = '{
  "max_products": 20,
  "max_categories": 4,
  "max_orders_per_month": 0,
  "max_users": 1,
  "features": {
    "ordersPanel": false,
    "onlinePayment": false,
    "autoPrint": false,
    "kitchenPrinter": false,
    "pizzaFractional": false,
    "advancedAddons": false,
    "combos": false,
    "distanceDeliveryFee": false,
    "advancedCoupons": false,
    "basicCoupons": false,
    "upsell": false,
    "customerCrm": false,
    "customerRecovery": false,
    "fullReports": false,
    "basicReports": false,
    "orderStatus": false,
    "manualPrint": false,
    "directoryFeatured": false,
    "hideMenuzinBrand": false,
    "multipleUsers": false,
    "dashboard": false
  }
}'::jsonb WHERE slug = 'presenca';

UPDATE public.plans SET limits = '{
  "max_products": null,
  "max_categories": null,
  "max_orders_per_month": 400,
  "max_users": 2,
  "features": {
    "ordersPanel": true,
    "onlinePayment": false,
    "autoPrint": false,
    "kitchenPrinter": false,
    "pizzaFractional": false,
    "advancedAddons": false,
    "combos": false,
    "distanceDeliveryFee": false,
    "advancedCoupons": false,
    "basicCoupons": true,
    "upsell": false,
    "customerCrm": true,
    "customerRecovery": false,
    "fullReports": false,
    "basicReports": true,
    "orderStatus": true,
    "manualPrint": true,
    "directoryFeatured": false,
    "hideMenuzinBrand": false,
    "multipleUsers": true,
    "dashboard": true
  }
}'::jsonb WHERE slug = 'start';

UPDATE public.plans SET limits = '{
  "max_products": null,
  "max_categories": null,
  "max_orders_per_month": null,
  "max_users": null,
  "features": {
    "ordersPanel": true,
    "onlinePayment": true,
    "autoPrint": true,
    "kitchenPrinter": true,
    "pizzaFractional": true,
    "advancedAddons": true,
    "combos": true,
    "distanceDeliveryFee": true,
    "advancedCoupons": true,
    "basicCoupons": true,
    "upsell": true,
    "customerCrm": true,
    "customerRecovery": true,
    "fullReports": true,
    "basicReports": true,
    "orderStatus": true,
    "manualPrint": true,
    "directoryFeatured": true,
    "hideMenuzinBrand": true,
    "multipleUsers": true,
    "dashboard": true
  }
}'::jsonb WHERE slug = 'pro';

-- 5. Reclassify tenants: existing 'start' becomes 'presenca'; keep 'pro' as-is.
UPDATE public.tenants SET plan = 'presenca' WHERE plan = 'start' OR plan IS NULL OR plan = '';

-- 6. Enforce allowed values on tenants.plan.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('presenca','start','pro'));
ALTER TABLE public.tenants ALTER COLUMN plan SET DEFAULT 'presenca';
