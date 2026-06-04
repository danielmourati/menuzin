-- Tighten RLS scope: restrict order_items UPDATE to authenticated users only
DROP POLICY IF EXISTS "order_items: tenant staff manages" ON public.order_items;
CREATE POLICY "order_items: tenant staff manages"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        public.has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
        OR public.is_platform_admin()
      )
  )
);

-- Remove unscoped anonymous read on delivery_zones. Storefront reads go through
-- supabaseAdmin in listPublicDeliveryZones/resolveDeliveryFee server functions,
-- so no anon SELECT policy is needed.
DROP POLICY IF EXISTS "Public can read active zones" ON public.delivery_zones;
REVOKE SELECT ON public.delivery_zones FROM anon;
