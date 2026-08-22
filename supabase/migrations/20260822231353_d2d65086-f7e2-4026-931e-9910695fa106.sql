DROP POLICY IF EXISTS "Public read pizza sizes" ON public.category_pizza_sizes;
CREATE POLICY "Public read pizza sizes" ON public.category_pizza_sizes
FOR SELECT TO anon, authenticated
USING (active AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_pizza_sizes.category_id AND c.active));

DROP POLICY IF EXISTS "Public read pizza doughs" ON public.category_pizza_doughs;
CREATE POLICY "Public read pizza doughs" ON public.category_pizza_doughs
FOR SELECT TO anon, authenticated
USING (active AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_pizza_doughs.category_id AND c.active));

DROP POLICY IF EXISTS "Public read pizza crusts" ON public.category_pizza_crusts;
CREATE POLICY "Public read pizza crusts" ON public.category_pizza_crusts
FOR SELECT TO anon, authenticated
USING (active AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_pizza_crusts.category_id AND c.active));