CREATE TABLE public.tenant_printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'kitchen' CHECK (role IN ('receipt','kitchen','bar','counter','other')),
  printer_name TEXT NOT NULL DEFAULT '',
  paper_width TEXT NOT NULL DEFAULT '80mm' CHECK (paper_width IN ('55mm','80mm')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tenant_printers_tenant_idx ON public.tenant_printers(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_printers TO authenticated;
GRANT ALL ON public.tenant_printers TO service_role;

ALTER TABLE public.tenant_printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage own printers"
  ON public.tenant_printers
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  );

CREATE TRIGGER tenant_printers_set_updated_at
  BEFORE UPDATE ON public.tenant_printers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();