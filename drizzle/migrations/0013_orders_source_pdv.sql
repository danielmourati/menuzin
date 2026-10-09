ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'storefront';

CREATE OR REPLACE FUNCTION public.notify_order_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
BEGIN
  IF NEW.source = 'pdv' THEN
    RETURN NEW;
  END IF;
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
$function$;