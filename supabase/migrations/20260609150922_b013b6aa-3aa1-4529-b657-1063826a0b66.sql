
-- 1) categories.kind
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'standard';

-- Validação via trigger (não usamos CHECK para permitir extensões futuras)
CREATE OR REPLACE FUNCTION public.validate_category_kind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind NOT IN ('standard', 'pizza') THEN
    RAISE EXCEPTION 'kind inválido: %', NEW.kind;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_category_kind ON public.categories;
CREATE TRIGGER trg_validate_category_kind
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.validate_category_kind();

-- 2) category_pizza_sizes
CREATE TABLE IF NOT EXISTS public.category_pizza_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  pieces int NOT NULL DEFAULT 8,
  max_flavors int NOT NULL DEFAULT 1,
  pdv_code text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_pizza_sizes TO authenticated;
GRANT SELECT ON public.category_pizza_sizes TO anon;
GRANT ALL ON public.category_pizza_sizes TO service_role;
ALTER TABLE public.category_pizza_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pizza sizes"
  ON public.category_pizza_sizes FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant staff manage pizza sizes"
  ON public.category_pizza_sizes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_sizes.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_sizes.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  );

CREATE TRIGGER trg_pizza_sizes_updated_at
  BEFORE UPDATE ON public.category_pizza_sizes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) category_pizza_doughs (massas)
CREATE TABLE IF NOT EXISTS public.category_pizza_doughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  extra_price numeric(10,2) NOT NULL DEFAULT 0,
  pdv_code text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_pizza_doughs TO authenticated;
GRANT SELECT ON public.category_pizza_doughs TO anon;
GRANT ALL ON public.category_pizza_doughs TO service_role;
ALTER TABLE public.category_pizza_doughs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pizza doughs"
  ON public.category_pizza_doughs FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant staff manage pizza doughs"
  ON public.category_pizza_doughs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_doughs.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_doughs.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  );

CREATE TRIGGER trg_pizza_doughs_updated_at
  BEFORE UPDATE ON public.category_pizza_doughs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) category_pizza_crusts (bordas)
CREATE TABLE IF NOT EXISTS public.category_pizza_crusts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  extra_price numeric(10,2) NOT NULL DEFAULT 0,
  pdv_code text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_pizza_crusts TO authenticated;
GRANT SELECT ON public.category_pizza_crusts TO anon;
GRANT ALL ON public.category_pizza_crusts TO service_role;
ALTER TABLE public.category_pizza_crusts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pizza crusts"
  ON public.category_pizza_crusts FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant staff manage pizza crusts"
  ON public.category_pizza_crusts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_crusts.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_pizza_crusts.category_id
        AND (
          public.is_platform_admin()
          OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        )
    )
  );

CREATE TRIGGER trg_pizza_crusts_updated_at
  BEFORE UPDATE ON public.category_pizza_crusts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) product_sizes.category_size_id
ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS category_size_id uuid REFERENCES public.category_pizza_sizes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_sizes_category_size_id
  ON public.product_sizes(category_size_id);

-- 6) Backfill: marcar como 'pizza' as categorias cujos produtos são todos type='pizza'
UPDATE public.categories c
SET kind = 'pizza'
WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id AND p.type = 'pizza')
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id AND p.type <> 'pizza');
