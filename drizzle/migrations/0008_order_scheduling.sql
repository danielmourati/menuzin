ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS scheduling_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS scheduling_slot_minutes integer NOT NULL DEFAULT 10;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS scheduling_days_ahead integer NOT NULL DEFAULT 7;