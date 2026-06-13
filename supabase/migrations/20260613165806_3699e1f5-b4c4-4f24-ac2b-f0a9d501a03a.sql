-- Remove overly permissive policy on realtime.messages.
-- The app does not subscribe to Realtime channels (uses polling instead),
-- so allowing any authenticated user to subscribe to any topic is unnecessary
-- and leaks tenant scoping. Drop the policy entirely.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;