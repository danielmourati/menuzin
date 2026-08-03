-- ============ guia_categories ============
CREATE TABLE public.guia_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '🍽️',
  image_url text,
  image_fit text NOT NULL DEFAULT 'cover',
  city text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guia_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_categories TO authenticated;
GRANT ALL ON public.guia_categories TO service_role;
ALTER TABLE public.guia_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guia_categories_public_read" ON public.guia_categories
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "guia_categories_admin_all" ON public.guia_categories
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER guia_categories_set_updated_at BEFORE UPDATE ON public.guia_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ guia_slots ============
CREATE TABLE public.guia_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  subtitle text,
  emoji text,
  gradient text,
  image_url text,
  image_fit text NOT NULL DEFAULT 'cover',
  href text,
  price numeric,
  promo_price numeric,
  discount_pct integer,
  rating numeric,
  delivery_fee numeric,
  store_name text,
  city text,
  ends_at timestamptz,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guia_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_slots TO authenticated;
GRANT ALL ON public.guia_slots TO service_role;
ALTER TABLE public.guia_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guia_slots_public_read" ON public.guia_slots
  FOR SELECT TO anon, authenticated
  USING (active = true AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "guia_slots_admin_all" ON public.guia_slots
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER guia_slots_set_updated_at BEFORE UPDATE ON public.guia_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX guia_slots_kind_idx ON public.guia_slots (kind, sort_order);

-- ============ guia_sections ============
CREATE TABLE public.guia_sections (
  id text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guia_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_sections TO authenticated;
GRANT ALL ON public.guia_sections TO service_role;
ALTER TABLE public.guia_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guia_sections_public_read" ON public.guia_sections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guia_sections_admin_all" ON public.guia_sections
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER guia_sections_set_updated_at BEFORE UPDATE ON public.guia_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ guia_promo_requests ============
CREATE TABLE public.guia_promo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  slot_kind text NOT NULL,
  duration_days integer NOT NULL DEFAULT 7,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  pix_code text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_promo_requests TO authenticated;
GRANT ALL ON public.guia_promo_requests TO service_role;
ALTER TABLE public.guia_promo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guia_requests_tenant_read" ON public.guia_promo_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY "guia_requests_tenant_insert" ON public.guia_promo_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY "guia_requests_admin_update" ON public.guia_promo_requests
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "guia_requests_admin_delete" ON public.guia_promo_requests
  FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE TRIGGER guia_requests_set_updated_at BEFORE UPDATE ON public.guia_promo_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seeds ============
INSERT INTO public.guia_categories (slug, label, emoji, sort_order) VALUES
  ('quentinha','Quentinhas','🍱',1),
  ('pizza','Pizza','🍕',2),
  ('churrasco','Churrasco','🥩',3),
  ('hamburguer','Hambúrguer','🍔',4),
  ('lanches','Lanches','🥪',5),
  ('marmitex','Marmitex','🍛',6),
  ('acai','Açaí','🍨',7),
  ('doces','Doces','🍰',8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.guia_sections (id, sort_order, active) VALUES
  ('categories',1,true),
  ('featured',2,true),
  ('top_stores',3,true),
  ('flash_offer',4,true),
  ('banner_1',5,true),
  ('collection',6,true),
  ('banner_2',7,true),
  ('featured_real',8,true),
  ('publish_cta',9,true)
ON CONFLICT (id) DO NOTHING;

-- novos produtos nascem visíveis no Guia
ALTER TABLE public.products ALTER COLUMN directory_visible SET DEFAULT true;