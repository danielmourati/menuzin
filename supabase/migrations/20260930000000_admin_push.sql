-- Adiciona campo user_id para os administradores receberem web push de novos pedidos
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_admin_device BOOLEAN NOT NULL DEFAULT false;

-- Novo índice
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON public.push_subscriptions(user_id);
