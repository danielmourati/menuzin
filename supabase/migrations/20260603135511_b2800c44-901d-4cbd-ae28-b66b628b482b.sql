-- 1. Replace public INSERT policy on order_status_history with tenant-staff one.
DROP POLICY IF EXISTS "order_status_history: anyone inserts" ON public.order_status_history;

CREATE POLICY "order_status_history: tenant staff inserts"
ON public.order_status_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (
        public.has_tenant_role(auth.uid(), o.tenant_id, ARRAY['owner','admin','staff']::app_role[])
        OR public.is_platform_admin()
      )
  )
);

-- 2. Hide the encrypted Mercado Pago access token from direct client queries.
--    Server functions read it via the service role (which keeps full access).
REVOKE SELECT (mp_access_token_encrypted) ON public.store_payment_settings FROM anon, authenticated;

-- 3. Enable RLS on realtime.messages and restrict subscriptions to authenticated users.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime: authenticated only" ON realtime.messages;
CREATE POLICY "realtime: authenticated only"
ON realtime.messages FOR SELECT TO authenticated
USING (true);