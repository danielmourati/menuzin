ALTER TABLE public.tenants ALTER COLUMN directory_opt_in SET DEFAULT true;
UPDATE public.tenants SET directory_opt_in = true WHERE directory_opt_in IS NULL OR directory_opt_in = false;