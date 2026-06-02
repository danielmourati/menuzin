
-- ============================================================
-- FASE 1: Admin global da plataforma (dmouraphb@gmail.com)
-- ============================================================

-- Promove o usuário (se já existir) a platform_admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'platform_admin'::app_role
FROM auth.users u
WHERE u.email = 'dmouraphb@gmail.com'
ON CONFLICT DO NOTHING;

-- Trigger: ao criar novo auth user com esse email, vira platform_admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_platform_admin_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'dmouraphb@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'platform_admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_platform_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_platform_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_platform_admin_seed();

-- ============================================================
-- FASE 2: Manter apenas Burger Prime + ajustar slug
-- ============================================================
-- Atualiza slug do Burger Prime para "burgerprime"
UPDATE public.tenants SET slug = 'burgerprime'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Remove dependências dos tenants que serão excluídos
DELETE FROM public.order_status_history
WHERE order_id IN (SELECT id FROM public.orders WHERE tenant_id <> '11111111-1111-1111-1111-111111111111');

DELETE FROM public.order_items
WHERE order_id IN (SELECT id FROM public.orders WHERE tenant_id <> '11111111-1111-1111-1111-111111111111');

DELETE FROM public.orders WHERE tenant_id <> '11111111-1111-1111-1111-111111111111';

DELETE FROM public.product_addons
WHERE product_id IN (SELECT id FROM public.products WHERE tenant_id <> '11111111-1111-1111-1111-111111111111');

DELETE FROM public.products WHERE tenant_id <> '11111111-1111-1111-1111-111111111111';
DELETE FROM public.categories WHERE tenant_id <> '11111111-1111-1111-1111-111111111111';
DELETE FROM public.store_payment_settings WHERE tenant_id <> '11111111-1111-1111-1111-111111111111';

-- Desvincula perfis/roles do tenant excluído (não apaga usuários)
UPDATE public.profiles SET tenant_id = NULL
WHERE tenant_id IS NOT NULL AND tenant_id <> '11111111-1111-1111-1111-111111111111';

DELETE FROM public.user_roles
WHERE tenant_id IS NOT NULL AND tenant_id <> '11111111-1111-1111-1111-111111111111';

DELETE FROM public.tenants WHERE id <> '11111111-1111-1111-1111-111111111111';

-- ============================================================
-- FASE 4: Catálogo avançado (pizzas, tamanhos, sabores, grupos de complementos)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS max_flavors integer,
  ADD COLUMN IF NOT EXISTS allow_observations boolean NOT NULL DEFAULT true;

-- Tamanhos por produto (ex.: Pizza Pequena/Média/Grande)
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON public.product_sizes(product_id);

GRANT SELECT ON public.product_sizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_sizes: anyone reads" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "product_sizes: tenant staff manages" ON public.product_sizes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_sizes.product_id
    AND (has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_sizes.product_id
    AND (has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())));

-- Sabores (para pizzas)
CREATE TABLE IF NOT EXISTS public.product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_flavors_product ON public.product_flavors(product_id);

GRANT SELECT ON public.product_flavors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_flavors TO authenticated;
GRANT ALL ON public.product_flavors TO service_role;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_flavors: anyone reads available" ON public.product_flavors FOR SELECT USING (available = true);
CREATE POLICY "product_flavors: tenant staff manages" ON public.product_flavors
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_flavors.product_id
    AND (has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_flavors.product_id
    AND (has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())));

-- Grupos de complementos (reutilizáveis no tenant)
CREATE TABLE IF NOT EXISTS public.addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addon_groups_tenant ON public.addon_groups(tenant_id);

GRANT SELECT ON public.addon_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_groups TO authenticated;
GRANT ALL ON public.addon_groups TO service_role;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addon_groups: anyone reads active" ON public.addon_groups FOR SELECT USING (active = true);
CREATE POLICY "addon_groups: tenant staff manages" ON public.addon_groups
  FOR ALL TO authenticated
  USING (has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())
  WITH CHECK (has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin());

-- Opções dos grupos
CREATE TABLE IF NOT EXISTS public.addon_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addon_options_group ON public.addon_options(group_id);

GRANT SELECT ON public.addon_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_options TO authenticated;
GRANT ALL ON public.addon_options TO service_role;
ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addon_options: anyone reads active" ON public.addon_options FOR SELECT USING (active = true);
CREATE POLICY "addon_options: tenant staff manages" ON public.addon_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_options.group_id
    AND (has_tenant_role(auth.uid(), g.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_options.group_id
    AND (has_tenant_role(auth.uid(), g.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())));

-- Vínculo do grupo a uma categoria OU a um produto específico
CREATE TABLE IF NOT EXISTS public.addon_group_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  category_id uuid NULL,
  product_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((category_id IS NULL) <> (product_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_addon_group_targets_group ON public.addon_group_targets(group_id);
CREATE INDEX IF NOT EXISTS idx_addon_group_targets_cat ON public.addon_group_targets(category_id);
CREATE INDEX IF NOT EXISTS idx_addon_group_targets_prod ON public.addon_group_targets(product_id);

GRANT SELECT ON public.addon_group_targets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_group_targets TO authenticated;
GRANT ALL ON public.addon_group_targets TO service_role;
ALTER TABLE public.addon_group_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addon_group_targets: anyone reads" ON public.addon_group_targets FOR SELECT USING (true);
CREATE POLICY "addon_group_targets: tenant staff manages" ON public.addon_group_targets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_group_targets.group_id
    AND (has_tenant_role(auth.uid(), g.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_group_targets.group_id
    AND (has_tenant_role(auth.uid(), g.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR is_platform_admin())));

-- ============================================================
-- FASE 5: Bucket público para imagens (produtos + logo do tenant)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tenant-assets: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

CREATE POLICY "tenant-assets: authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tenant-assets');

CREATE POLICY "tenant-assets: authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tenant-assets');

CREATE POLICY "tenant-assets: authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tenant-assets');

-- ============================================================
-- FASE 6: Largura do papel térmico (POS)
-- ============================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS pos_paper_width text NOT NULL DEFAULT '80mm';
