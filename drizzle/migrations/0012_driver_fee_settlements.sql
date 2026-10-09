ALTER TABLE public.cash_driver_settlements
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'cash_return',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS movement_id uuid REFERENCES public.cash_movements(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cash_driver_settlements_unique_kind ON public.cash_driver_settlements (session_id, driver_id, kind);
DROP INDEX IF EXISTS public.cash_driver_settlements_unique;