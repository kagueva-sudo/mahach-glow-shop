
-- Tighten has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Replace permissive orders INSERT policy with one that requires non-empty fields
DROP POLICY IF EXISTS "anyone can create an order" ON public.orders;
CREATE POLICY "anyone can create an order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(customer_name) BETWEEN 2 AND 80
    AND length(phone) BETWEEN 5 AND 30
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
    AND total >= 0
    AND status = 'new'
  );
