CREATE TABLE public.ai_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  message text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_quick_replies TO authenticated;
GRANT ALL ON public.ai_quick_replies TO service_role;
ALTER TABLE public.ai_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage quick replies" ON public.ai_quick_replies FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]));
CREATE INDEX ai_quick_replies_tenant_idx ON public.ai_quick_replies(tenant_id, sort_order);

ALTER TABLE public.ai_conversations ADD COLUMN handoff_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.ai_conversations ADD COLUMN handoff_requested_at timestamptz;
ALTER TABLE public.ai_conversations ADD CONSTRAINT ai_conversations_handoff_chk CHECK (handoff_status IN ('none','requested','human','closed'));