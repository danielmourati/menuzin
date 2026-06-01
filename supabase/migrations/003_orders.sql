-- ============================================================
-- Migration: 003_orders.sql
-- Create orders table with separate payment and order status
-- ============================================================

-- Create tables and check constraints for enums
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number SERIAL,
  customer_name VARCHAR(255) NOT NULL,
  customer_whatsapp VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('entrega', 'retirada', 'consumo_local')),
  
  -- Statuses separation
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_payment', 'new', 'confirmed', 'preparing', 
    'out_for_delivery', 'ready_for_pickup', 'completed', 'cancelled'
  )),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'approved', 'rejected', 'cancelled', 
    'refunded', 'expired', 'charged_back'
  )),
  
  payment_method VARCHAR(100),
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Mercado Pago details
  mp_payment_id VARCHAR(255),
  mp_order_id VARCHAR(255),
  mp_status VARCHAR(100),
  mp_status_detail TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for multi-tenant isolation and routing
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON orders(mp_payment_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
