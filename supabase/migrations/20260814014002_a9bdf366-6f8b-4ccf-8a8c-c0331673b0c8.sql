DROP POLICY IF EXISTS "Public can read promo modals" ON public.promo_modals;

CREATE POLICY "Public can read enabled promo modals"
ON public.promo_modals FOR SELECT
TO anon, authenticated
USING (enabled = true);

CREATE POLICY "Tenant admins can read own promo modal"
ON public.promo_modals FOR SELECT
TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, ARRAY['admin'::app_role, 'owner'::app_role]));