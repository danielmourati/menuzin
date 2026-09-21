-- Remove políticas públicas permissivas (USING true) e restringe ao staff do tenant

-- drivers
DROP POLICY IF EXISTS "Permitir leitura de entregadores do tenant" ON public.drivers;
DROP POLICY IF EXISTS "Permitir escrita de entregadores do tenant" ON public.drivers;

CREATE POLICY "drivers: tenant staff reads"
ON public.drivers FOR SELECT TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "drivers: tenant staff inserts"
ON public.drivers FOR INSERT TO authenticated
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "drivers: tenant staff updates"
ON public.drivers FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin())
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "drivers: tenant staff deletes"
ON public.drivers FOR DELETE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

REVOKE ALL ON public.drivers FROM anon;

-- push_campaigns: apenas staff do tenant (escrita de disparo/status é feita server-side com service role)
DROP POLICY IF EXISTS "Permitir leitura e escrita de push campaigns" ON public.push_campaigns;

CREATE POLICY "push_campaigns: tenant staff reads"
ON public.push_campaigns FOR SELECT TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "push_campaigns: tenant staff inserts"
ON public.push_campaigns FOR INSERT TO authenticated
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "push_campaigns: tenant staff updates"
ON public.push_campaigns FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin())
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

CREATE POLICY "push_campaigns: tenant staff deletes"
ON public.push_campaigns FOR DELETE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

REVOKE ALL ON public.push_campaigns FROM anon;

-- push_subscriptions: staff apenas lê; inscrições/atualizações/exclusões são server-side (service role)
DROP POLICY IF EXISTS "Permitir leitura e escrita de push subscriptions" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions: tenant staff reads"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner'::public.app_role, 'admin'::public.app_role]) OR public.is_platform_admin());

REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.push_subscriptions FROM authenticated;