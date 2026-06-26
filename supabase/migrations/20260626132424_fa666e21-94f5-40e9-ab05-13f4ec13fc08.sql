ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS notification_sound_url text,
  ADD COLUMN IF NOT EXISTS notification_sound_name text;