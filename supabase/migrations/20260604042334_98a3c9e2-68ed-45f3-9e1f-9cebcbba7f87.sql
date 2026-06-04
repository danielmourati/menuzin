
-- Remove anonymous INSERT policies on orders and order_items.
-- All order creation flows through supabaseAdmin (service_role) in createOrder server fn,
-- so removing the public/anon INSERT vector eliminates the "append items to a guessed
-- order UUID" attack without breaking checkout.
DROP POLICY IF EXISTS "orders: customers insert" ON public.orders;
DROP POLICY IF EXISTS "order_items: anyone inserts on create" ON public.order_items;

-- Add explicit public SELECT policy on storage.objects for the tenant-assets bucket.
-- The bucket is already public at the CDN level (logos and product images need to be
-- readable by anyone), but an explicit RLS policy makes intent clear and ensures RLS
-- enforces read scope if the bucket is ever made private later.
DROP POLICY IF EXISTS "tenant-assets public read" ON storage.objects;
CREATE POLICY "tenant-assets public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tenant-assets');
