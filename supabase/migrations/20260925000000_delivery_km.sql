-- Add columns for KM delivery mode
ALTER TABLE tenants
ADD COLUMN delivery_base_km numeric DEFAULT 0,
ADD COLUMN delivery_fee_per_km numeric DEFAULT 0,
ADD COLUMN delivery_max_km numeric DEFAULT null;
