
CREATE TABLE public.promo_modals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  image_url text NOT NULL,
  cta_label text NOT NULL DEFAULT 'EU QUERO!',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  schedule_mode text NOT NULL DEFAULT 'window' CHECK (schedule_mode IN ('window','recurring')),
  starts_at timestamptz,
  ends_at timestamptz,
  weekdays smallint[],
  time_start time,
  time_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

GRANT SELECT ON public.promo_modals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_modals TO authenticated;
GRANT ALL ON public.promo_modals TO service_role;

ALTER TABLE public.promo_modals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read promo modals"
  ON public.promo_modals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant admins can insert promo modal"
  ON public.promo_modals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['admin','owner']::app_role[]));

CREATE POLICY "Tenant admins can update promo modal"
  ON public.promo_modals FOR UPDATE
  TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['admin','owner']::app_role[]))
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['admin','owner']::app_role[]));

CREATE POLICY "Tenant admins can delete promo modal"
  ON public.promo_modals FOR DELETE
  TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, ARRAY['admin','owner']::app_role[]));

CREATE TRIGGER promo_modals_set_updated_at
  BEFORE UPDATE ON public.promo_modals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_promo_modal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.schedule_mode = 'window' THEN
    IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
      RAISE EXCEPTION 'Janela única exige starts_at e ends_at';
    END IF;
    IF NEW.ends_at <= NEW.starts_at THEN
      RAISE EXCEPTION 'ends_at deve ser maior que starts_at';
    END IF;
  ELSIF NEW.schedule_mode = 'recurring' THEN
    IF NEW.weekdays IS NULL OR array_length(NEW.weekdays, 1) IS NULL THEN
      RAISE EXCEPTION 'Recorrência exige ao menos um dia da semana';
    END IF;
    IF NEW.time_start IS NULL OR NEW.time_end IS NULL THEN
      RAISE EXCEPTION 'Recorrência exige time_start e time_end';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_modals_validate
  BEFORE INSERT OR UPDATE ON public.promo_modals
  FOR EACH ROW EXECUTE FUNCTION public.validate_promo_modal();
