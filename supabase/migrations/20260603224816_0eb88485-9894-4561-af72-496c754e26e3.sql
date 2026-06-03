-- 1) Tighten order_items public INSERT to only allow appending items to a freshly created order in an active tenant
DROP POLICY IF EXISTS "order_items: anyone inserts on create" ON public.order_items;
CREATE POLICY "order_items: anyone inserts on create"
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.tenants t ON t.id = o.tenant_id
      WHERE o.id = order_items.order_id
        AND o.status = 'novo'::order_status
        AND t.active = true
        AND o.created_at > now() - interval '15 minutes'
    )
  );

-- 2) Remove orders/order_status_history from realtime publication to prevent cross-tenant leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.order_status_history;
