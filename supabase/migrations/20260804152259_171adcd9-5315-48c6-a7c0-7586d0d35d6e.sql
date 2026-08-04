ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS birthdate date;