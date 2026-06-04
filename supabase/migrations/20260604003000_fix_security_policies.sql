-- Migration: 20260604003000_fix_security_policies.sql

-- 1. Restrict realtime.messages subscriptions to authenticated tenant members or platform admins
DROP POLICY IF EXISTS "realtime: authenticated only" ON realtime.messages;

CREATE POLICY "realtime: authenticated only"
ON realtime.messages FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id IS NOT NULL
      AND realtime.messages.topic LIKE 'tenant:' || ur.tenant_id::text || '%'
  )
);

-- 2. Restrict payments INSERT to authenticated users and validate referenced order and tenant
DROP POLICY IF EXISTS "payments: anyone inserts for active tenant" ON public.payments;

CREATE POLICY "payments: authenticated inserts with valid order"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payments.order_id
      AND o.tenant_id = payments.tenant_id
  )
);
