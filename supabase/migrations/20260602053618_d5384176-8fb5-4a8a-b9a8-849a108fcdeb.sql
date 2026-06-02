ALTER TABLE public.addon_groups
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'adicional';

ALTER TABLE public.addon_groups
  DROP CONSTRAINT IF EXISTS addon_groups_kind_check;

ALTER TABLE public.addon_groups
  ADD CONSTRAINT addon_groups_kind_check CHECK (kind IN ('adicional','observacao'));