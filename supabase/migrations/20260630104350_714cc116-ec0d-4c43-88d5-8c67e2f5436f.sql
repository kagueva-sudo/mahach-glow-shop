GRANT INSERT ON TABLE public.orders TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;