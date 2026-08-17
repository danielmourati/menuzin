-- product_sizes: only for available products
DROP POLICY "product_sizes: anyone reads" ON public.product_sizes;
CREATE POLICY "product_sizes: reads available products" ON public.product_sizes
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_sizes.product_id AND p.available = true)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_sizes.product_id
             AND (public.has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR public.is_platform_admin()))
);

-- product_addons: only for available products
DROP POLICY "product_addons: anyone reads" ON public.product_addons;
CREATE POLICY "product_addons: reads available products" ON public.product_addons
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_addons.product_id AND p.available = true)
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_addons.product_id
             AND (public.has_tenant_role(auth.uid(), p.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR public.is_platform_admin()))
);

-- addon_group_targets: only for active addon groups
DROP POLICY "addon_group_targets: anyone reads" ON public.addon_group_targets;
CREATE POLICY "addon_group_targets: reads active groups" ON public.addon_group_targets
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_group_targets.group_id AND g.active = true)
  OR EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_group_targets.group_id
             AND (public.has_tenant_role(auth.uid(), g.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role]) OR public.is_platform_admin()))
);