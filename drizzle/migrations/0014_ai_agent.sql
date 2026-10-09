CREATE TABLE public.ai_agent_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  agent_name text NOT NULL DEFAULT 'Zinho',
  tone text NOT NULL DEFAULT 'descontraido' CHECK (tone IN ('descontraido','formal')),
  greeting text NOT NULL DEFAULT '',
  extra_instructions text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_agent_settings TO authenticated;
GRANT ALL ON public.ai_agent_settings TO service_role;
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ai settings" ON public.ai_agent_settings FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[]));
CREATE POLICY "owner write ai settings" ON public.ai_agent_settings FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin']::app_role[]));

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_key text NOT NULL,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','ordered','closed')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  draft jsonb,
  message_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_tenant_idx ON public.ai_conversations(tenant_id, updated_at DESC);
GRANT SELECT ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ai conversations" ON public.ai_conversations FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), tenant_id, ARRAY['owner','admin','staff']::app_role[]));

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  ai_message_id text,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_conv_idx ON public.ai_messages(conversation_id, created_at);
GRANT SELECT ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ai messages" ON public.ai_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id
    AND (public.is_platform_admin() OR public.has_tenant_role(auth.uid(), c.tenant_id, ARRAY['owner','admin','staff']::app_role[]))));