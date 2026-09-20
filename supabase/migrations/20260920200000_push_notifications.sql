-- Migration: Web Push Subscriptions and Push Campaigns for Multi-tenant Promotions/Coupons
-- File: supabase/migrations/20260920200000_push_notifications.sql

-- 1. Table for Browser Web Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_phone TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_tenant_id ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_customer_phone ON public.push_subscriptions(customer_phone);

-- 2. Table for Push Campaigns
CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  url TEXT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'customers_with_orders'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'failed'
  sent_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_camp_tenant_id ON public.push_campaigns(tenant_id);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Permitir leitura e escrita de push subscriptions'
  ) THEN
    CREATE POLICY "Permitir leitura e escrita de push subscriptions" ON public.push_subscriptions FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_campaigns' AND policyname = 'Permitir leitura e escrita de push campaigns'
  ) THEN
    CREATE POLICY "Permitir leitura e escrita de push campaigns" ON public.push_campaigns FOR ALL USING (true);
  END IF;
END $$;
