DROP POLICY IF EXISTS "anyone can insert directory clicks" ON public.directory_clicks;

REVOKE INSERT ON public.directory_clicks FROM anon, authenticated;