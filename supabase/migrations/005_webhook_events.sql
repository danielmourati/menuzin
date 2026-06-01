-- ============================================================
-- Migration: 005_webhook_events.sql
-- Create webhook_events table to log all incoming notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL DEFAULT 'mercadopago',
  event_type VARCHAR(255) NOT NULL,
  provider_event_id VARCHAR(255),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Raw webhook payload
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for processing performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id ON webhook_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_store_id ON webhook_events(store_id);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
