CREATE TABLE public.guia_highlight_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  slot_kind text NOT NULL,
  duration_days integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guia_highlight_plans TO authenticated;
GRANT ALL ON public.guia_highlight_plans TO service_role;

ALTER TABLE public.guia_highlight_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem planos ativos"
  ON public.guia_highlight_plans FOR SELECT TO authenticated
  USING (active OR public.is_platform_admin());

CREATE POLICY "Superadmin gerencia planos de destaque"
  ON public.guia_highlight_plans FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TRIGGER guia_highlight_plans_set_updated_at
  BEFORE UPDATE ON public.guia_highlight_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.guia_highlight_plans (id, name, slot_kind, duration_days, price, description, active, sort_order) VALUES
('hero-7','Hero - 7 Dias','hero',7,149.9,'Banner no topo do Guia por 7 dias',true,1),
('hero-14','Hero - 14 Dias','hero',14,249.9,'Banner no topo do Guia por 14 dias',true,2),
('hero-30','Hero - 30 Dias','hero',30,449.9,'Banner no topo do Guia por 30 dias',true,3),
('featured-7','Destaque Produto - 7 Dias','featured',7,49.9,'Card de produto em destaque por 7 dias',true,4),
('featured-14','Destaque Produto - 14 Dias','featured',14,89.9,'Card de produto em destaque por 14 dias',true,5),
('featured-30','Destaque Produto - 30 Dias','featured',30,149.9,'Card de produto em destaque por 30 dias',true,6),
('top_stores-7','Loja em Alta - 7 Dias','top_stores',7,39.9,'Exibição na lista de Lojas em Alta por 7 dias',true,7),
('top_stores-14','Loja em Alta - 14 Dias','top_stores',14,69.9,'Exibição na lista de Lojas em Alta por 14 dias',true,8),
('top_stores-30','Loja em Alta - 30 Dias','top_stores',30,119.9,'Exibição na lista de Lojas em Alta por 30 dias',true,9),
('banner-7','Banner Full - 7 Dias','banner',7,199.9,'Banner largura total por 7 dias',true,10),
('banner-14','Banner Full - 14 Dias','banner',14,349.9,'Banner largura total por 14 dias',true,11),
('banner-30','Banner Full - 30 Dias','banner',30,599.9,'Banner largura total por 30 dias',true,12),
('collection-7','Coleção - 7 Dias','collection',7,79.9,'Destaque no carrossel de coleções por 7 dias',true,13),
('collection-14','Coleção - 14 Dias','collection',14,139.9,'Destaque no carrossel de coleções por 14 dias',true,14),
('collection-30','Coleção - 30 Dias','collection',30,229.9,'Destaque no carrossel de coleções por 30 dias',true,15),
('flash_offer-7','Oferta Relâmpago - 7 Dias','flash_offer',7,29.9,'Oferta relâmpago com cronômetro por 7 dias',true,16),
('flash_offer-14','Oferta Relâmpago - 14 Dias','flash_offer',14,49.9,'Oferta relâmpago com cronômetro por 14 dias',true,17),
('flash_offer-30','Oferta Relâmpago - 30 Dias','flash_offer',30,79.9,'Oferta relâmpago com cronômetro por 30 dias',true,18);