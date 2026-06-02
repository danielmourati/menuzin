-- Atualiza check constraint para aceitar os novos valores de largura
ALTER TABLE public.printer_settings
  DROP CONSTRAINT IF EXISTS printer_settings_paper_width_check;

-- Migra dados legados antes de recriar a constraint
UPDATE public.printer_settings SET paper_width = '55mm' WHERE paper_width = '58mm';

ALTER TABLE public.printer_settings
  ADD CONSTRAINT printer_settings_paper_width_check
  CHECK (paper_width IN ('55mm', '80mm'));

-- Também aplica em tenants.pos_paper_width por consistência (sem constraint, apenas dado)
UPDATE public.tenants SET pos_paper_width = '55mm' WHERE pos_paper_width = '58mm';