ALTER TABLE public.public_drivers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_drivers;