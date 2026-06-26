
GRANT SELECT ON public.user_roles TO authenticated;

-- products
DROP POLICY IF EXISTS "anyone can read published products" ON public.products;
CREATE POLICY "anyone can read published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins can insert products" ON public.products;
CREATE POLICY "admins can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins can update products" ON public.products;
CREATE POLICY "admins can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins can delete products" ON public.products;
CREATE POLICY "admins can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- orders
DROP POLICY IF EXISTS "admins can read orders" ON public.orders;
CREATE POLICY "admins can read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins can update orders" ON public.orders;
CREATE POLICY "admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins can delete orders" ON public.orders;
CREATE POLICY "admins can delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- site_settings
DROP POLICY IF EXISTS "admins insert site_settings" ON public.site_settings;
CREATE POLICY "admins insert site_settings" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins update site_settings" ON public.site_settings;
CREATE POLICY "admins update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins delete site_settings" ON public.site_settings;
CREATE POLICY "admins delete site_settings" ON public.site_settings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- storage.objects (site-assets)
DROP POLICY IF EXISTS "admins upload site-assets" ON storage.objects;
CREATE POLICY "admins upload site-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins update site-assets" ON storage.objects;
CREATE POLICY "admins update site-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins delete site-assets" ON storage.objects;
CREATE POLICY "admins delete site-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "admins read site-assets" ON storage.objects;
CREATE POLICY "admins read site-assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
