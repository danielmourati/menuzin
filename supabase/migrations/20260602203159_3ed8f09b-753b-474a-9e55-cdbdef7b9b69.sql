ALTER TABLE public.printer_settings
  ADD COLUMN IF NOT EXISTS auto_connect boolean NOT NULL DEFAULT false;