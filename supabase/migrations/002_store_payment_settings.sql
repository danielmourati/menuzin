-- ============================================================
-- Migration: 002_store_payment_settings.sql
-- Create tenant gateway integration settings (OAuth MP)
-- ============================================================

CREATE TABLE IF NOT EXISTS store_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL DEFAULT 'mercadopago',
  
  -- Mercado Pago Auth details
  mp_user_id VARCHAR(255),
  mp_public_key VARCHAR(255),
  mp_access_token_encrypted TEXT, -- AES-GCM encrypted — NEVER expose on frontend
  mp_refresh_token_encrypted TEXT, -- AES-GCM encrypted — NEVER expose on frontend
  mp_token_expires_at TIMESTAMPTZ,
  mp_connected BOOLEAN NOT NULL DEFAULT FALSE,
  mp_live_mode BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Manual methods configurations
  pix_manual_key VARCHAR(255),
  pix_manual_key_type VARCHAR(50),
  pix_manual_receiver VARCHAR(255),
  
  cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pix_manual_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  card_on_delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Online methods configurations (requires mp_connected = true)
  pix_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  credit_card_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  debit_card_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and multi-tenant queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_payment_settings_store_id ON store_payment_settings(store_id);

-- Enable RLS
ALTER TABLE store_payment_settings ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_timestamp_store_payment_settings
BEFORE UPDATE ON store_payment_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
