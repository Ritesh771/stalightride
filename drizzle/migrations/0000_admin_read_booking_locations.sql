DROP POLICY IF EXISTS "Admins read booking locations" ON public.booking_locations;
CREATE POLICY "Admins read booking locations" ON public.booking_locations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));