-- 1. Drop overly permissive SELECT policies on order-related tables
DROP POLICY IF EXISTS "orders: customer reads by id" ON public.orders;
DROP POLICY IF EXISTS "payments: anyone reads" ON public.payments;
DROP POLICY IF EXISTS "order_items: anyone reads" ON public.order_items;
DROP POLICY IF EXISTS "order_status_history: anyone reads" ON public.order_status_history;

-- 2. Add tenant-staff scoped SELECT policies
CREATE POLICY "orders: tenant staff reads"
ON public.orders FOR SELECT TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  OR public.is_platform_admin()
);

CREATE POLICY "payments: tenant staff reads"
ON public.payments FOR SELECT TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  OR public.is_platform_admin()
);

CREATE POLICY "order_items: tenant staff reads"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        public.has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        OR public.is_platform_admin()
      )
  )
);

CREATE POLICY "order_status_history: tenant staff reads"
ON public.order_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (
        public.has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        OR public.is_platform_admin()
      )
  )
);

-- 3. Tighten storage policies on tenant-assets to scope by path prefix
DROP POLICY IF EXISTS "tenant-assets: authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "tenant-assets: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "tenant-assets: authenticated upload" ON storage.objects;

CREATE POLICY "tenant-assets: tenant member uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id::text = split_part(name, '/', 1)
        AND ur.role = ANY (ARRAY['owner','admin','staff']::app_role[])
    )
  )
);

CREATE POLICY "tenant-assets: tenant member updates"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id::text = split_part(name, '/', 1)
        AND ur.role = ANY (ARRAY['owner','admin','staff']::app_role[])
    )
  )
);

CREATE POLICY "tenant-assets: tenant member deletes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id::text = split_part(name, '/', 1)
        AND ur.role = ANY (ARRAY['owner','admin','staff']::app_role[])
    )
  )
);