CREATE OR REPLACE FUNCTION public.is_pool_trip_driver(_trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pool_trips t WHERE t.id = _trip_id AND t.driver_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_pool_request_on_trip(_trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pool_requests r WHERE r.trip_id = _trip_id AND r.passenger_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_pool_trip_driver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_pool_request_on_trip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pool_trip_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pool_request_on_trip(uuid) TO authenticated;

DROP POLICY IF EXISTS "Drivers view requests on own trips" ON public.pool_requests;
CREATE POLICY "Drivers view requests on own trips" ON public.pool_requests
FOR SELECT TO authenticated USING (public.is_pool_trip_driver(trip_id));

DROP POLICY IF EXISTS "Drivers decide requests on own trips" ON public.pool_requests;
CREATE POLICY "Drivers decide requests on own trips" ON public.pool_requests
FOR UPDATE TO authenticated USING (public.is_pool_trip_driver(trip_id)) WITH CHECK (public.is_pool_trip_driver(trip_id));

DROP POLICY IF EXISTS "Passengers view trips they requested" ON public.pool_trips;
CREATE POLICY "Passengers view trips they requested" ON public.pool_trips
FOR SELECT TO authenticated USING (public.has_pool_request_on_trip(id));