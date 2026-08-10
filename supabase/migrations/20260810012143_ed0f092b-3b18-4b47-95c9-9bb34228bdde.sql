CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  subject text NOT NULL,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'contato',
  ip text,
  status text NOT NULL DEFAULT 'nova',
  internal_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can update support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE TRIGGER support_messages_set_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_support_messages_created_at ON public.support_messages (created_at DESC);