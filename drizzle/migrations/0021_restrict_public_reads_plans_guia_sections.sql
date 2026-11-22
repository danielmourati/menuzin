DROP POLICY IF EXISTS plans_read_all ON public.plans;
CREATE POLICY plans_read_active ON public.plans FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS guia_sections_public_read ON public.guia_sections;
CREATE POLICY guia_sections_public_read_active ON public.guia_sections FOR SELECT TO anon, authenticated USING (active = true);