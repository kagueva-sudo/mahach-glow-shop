
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "authenticated read site-assets" ON storage.objects;
CREATE POLICY "admins read site-assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));
