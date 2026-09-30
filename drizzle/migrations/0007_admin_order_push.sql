ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS is_admin_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS push_subscriptions_admin_idx ON public.push_subscriptions(tenant_id) WHERE is_admin_device;

CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_config FROM anon, authenticated;
GRANT ALL ON public.internal_config TO service_role;
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_config(key, value)
VALUES ('order_push_token', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_order_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE tenant_id = NEW.tenant_id AND is_admin_device) THEN
    RETURN NEW;
  END IF;
  SELECT value INTO v_token FROM public.internal_config WHERE key = 'order_push_token';
  PERFORM net.http_post(
    url := 'https://menuzin.app/api/public/order-push',
    headers := jsonb_build_object('Content-Type','application/json','x-push-token', v_token),
    body := jsonb_build_object('order_id', NEW.id, 'tenant_id', NEW.tenant_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_order_push falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_order_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_notify_push ON public.orders;
CREATE TRIGGER orders_notify_push AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_push();