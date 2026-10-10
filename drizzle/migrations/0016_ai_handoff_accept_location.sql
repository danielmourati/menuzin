ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS handoff_staff_name text,
  ADD COLUMN IF NOT EXISTS handoff_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_location jsonb;