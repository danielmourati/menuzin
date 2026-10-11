ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_due_on_delivery numeric NOT NULL DEFAULT 0;