CREATE TABLE public.cash_offshift_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day date NOT NULL,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, day)
);
GRANT SELECT, INSERT, DELETE ON public.cash_offshift_dismissals TO authenticated;
GRANT ALL ON public.cash_offshift_dismissals TO service_role;
ALTER TABLE public.cash_offshift_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant admins manage offshift dismissals" ON public.cash_offshift_dismissals
FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]) OR public.is_platform_admin())
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]) OR public.is_platform_admin());