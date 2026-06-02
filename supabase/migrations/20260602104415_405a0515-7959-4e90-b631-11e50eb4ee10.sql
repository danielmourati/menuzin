-- Create printer_settings table for per-tenant thermal printer configuration
CREATE TABLE public.printer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL DEFAULT '',
  printer_model TEXT NOT NULL DEFAULT 'escpos_generic',
  paper_width TEXT NOT NULL DEFAULT '80mm' CHECK (paper_width IN ('58mm','80mm')),
  connection_type TEXT NOT NULL DEFAULT 'browser' CHECK (connection_type IN ('bluetooth','usb','network','browser')),
  escpos_profile TEXT NOT NULL DEFAULT 'generic' CHECK (escpos_profile IN ('generic','mini_bt_58','generic_80','elgin_i8_i9')),
  font_size TEXT NOT NULL DEFAULT 'normal' CHECK (font_size IN ('normal','compact')),
  use_bold_titles BOOLEAN NOT NULL DEFAULT true,
  use_double_total BOOLEAN NOT NULL DEFAULT true,
  show_store_name BOOLEAN NOT NULL DEFAULT true,
  show_address BOOLEAN NOT NULL DEFAULT true,
  show_document BOOLEAN NOT NULL DEFAULT true,
  show_whatsapp BOOLEAN NOT NULL DEFAULT true,
  show_pix BOOLEAN NOT NULL DEFAULT true,
  show_instagram BOOLEAN NOT NULL DEFAULT true,
  show_thank_message BOOLEAN NOT NULL DEFAULT true,
  thank_message TEXT NOT NULL DEFAULT 'Obrigado, volte sempre!',
  separator_char TEXT NOT NULL DEFAULT '-',
  cut_type TEXT NOT NULL DEFAULT 'none' CHECK (cut_type IN ('none','partial','full')),
  feed_lines INTEGER NOT NULL DEFAULT 3 CHECK (feed_lines BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.printer_settings TO authenticated;
GRANT ALL ON public.printer_settings TO service_role;

ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view printer settings"
ON public.printer_settings FOR SELECT
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[])
  OR public.is_platform_admin()
);

CREATE POLICY "Tenant admins can insert printer settings"
ON public.printer_settings FOR INSERT
TO authenticated
WITH CHECK (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[])
  OR public.is_platform_admin()
);

CREATE POLICY "Tenant admins can update printer settings"
ON public.printer_settings FOR UPDATE
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[])
  OR public.is_platform_admin()
);

CREATE POLICY "Tenant admins can delete printer settings"
ON public.printer_settings FOR DELETE
TO authenticated
USING (
  public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[])
  OR public.is_platform_admin()
);

CREATE TRIGGER printer_settings_set_updated_at
BEFORE UPDATE ON public.printer_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();