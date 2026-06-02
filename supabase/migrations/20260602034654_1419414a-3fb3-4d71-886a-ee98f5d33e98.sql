-- 1) Tighten over-permissive non-SELECT policies

-- orders INSERT: must reference an existing, active tenant
DROP POLICY IF EXISTS "orders: customers insert" ON public.orders;
CREATE POLICY "orders: customers insert"
ON public.orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = orders.tenant_id AND t.active = true
  )
);

-- order_items INSERT: must reference an existing order
DROP POLICY IF EXISTS "order_items: anyone inserts on create" ON public.order_items;
CREATE POLICY "order_items: anyone inserts on create"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id)
);

-- order_items UPDATE: mirror USING in WITH CHECK
DROP POLICY IF EXISTS "order_items: tenant staff manages" ON public.order_items;
CREATE POLICY "order_items: tenant staff manages"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
           OR is_platform_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner'::app_role,'admin'::app_role,'staff'::app_role])
           OR is_platform_admin())
  )
);

-- order_status_history INSERT: must reference an existing order
DROP POLICY IF EXISTS "order_status_history: anyone inserts" ON public.order_status_history;
CREATE POLICY "order_status_history: anyone inserts"
ON public.order_status_history
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id)
);

-- 2) Public bucket listing: drop broad SELECT policy.
--    Public buckets still serve files by direct URL; this only disables listing.
DROP POLICY IF EXISTS "tenant-assets: public read" ON storage.objects;

-- 3) Revoke EXECUTE on internal trigger functions from anon/authenticated.
--    These are invoked only by triggers and never need to be callable via the API.
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_platform_admin_seed() FROM PUBLIC, anon, authenticated;
