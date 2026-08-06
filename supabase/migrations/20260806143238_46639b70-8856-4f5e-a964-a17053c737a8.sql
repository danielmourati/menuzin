-- Impede escalonamento de acesso: usuário não pode definir/alterar o próprio tenant_id.
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;

CREATE POLICY "profiles: insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND (
    tenant_id IS NULL
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = profiles.tenant_id
    )
  )
);

CREATE POLICY "profiles: update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    public.is_platform_admin()
    OR tenant_id IS NOT DISTINCT FROM (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = profiles.tenant_id
    )
  )
);