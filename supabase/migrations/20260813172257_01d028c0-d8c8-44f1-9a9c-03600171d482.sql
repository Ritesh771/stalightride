-- Car pooling module (independent of rentals)
CREATE TABLE public.pool_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_label text NOT NULL,
  origin_label text NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  dest_label text NOT NULL,
  dest_lat double precision NOT NULL,
  dest_lng double precision NOT NULL,
  route jsonb NOT NULL DEFAULT '[]'::jsonb,
  depart_at timestamptz NOT NULL,
  seats_total smallint NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  seats_available smallint NOT NULL CHECK (seats_available >= 0),
  fare_per_seat numeric NOT NULL CHECK (fare_per_seat >= 0),
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','started','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seats_available <= seats_total)
);

CREATE TABLE public.pool_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.pool_trips(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_label text NOT NULL,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  drop_label text NOT NULL,
  drop_lat double precision NOT NULL,
  drop_lng double precision NOT NULL,
  seats smallint NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 8),
  fare_total numeric NOT NULL DEFAULT 0 CHECK (fare_total >= 0),
  match_score numeric NOT NULL DEFAULT 0,
  note text,
  status booking_status NOT NULL DEFAULT 'pending',
  cancelled_by uuid,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pool_trips_search_idx ON public.pool_trips (status, depart_at);
CREATE INDEX pool_trips_driver_idx ON public.pool_trips (driver_id);
CREATE INDEX pool_requests_trip_idx ON public.pool_requests (trip_id);
CREATE INDEX pool_requests_passenger_idx ON public.pool_requests (passenger_id);
CREATE UNIQUE INDEX pool_requests_one_active_idx ON public.pool_requests (trip_id, passenger_id)
  WHERE status IN ('pending','confirmed');

GRANT SELECT ON public.pool_trips TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pool_trips TO authenticated;
GRANT ALL ON public.pool_trips TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pool_requests TO authenticated;
GRANT ALL ON public.pool_requests TO service_role;

ALTER TABLE public.pool_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open upcoming pool trips" ON public.pool_trips
  FOR SELECT TO anon, authenticated
  USING (status = 'scheduled' AND seats_available > 0 AND depart_at > now());

CREATE POLICY "Drivers view own pool trips" ON public.pool_trips
  FOR SELECT TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "Passengers view trips they requested" ON public.pool_trips
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pool_requests r
    WHERE r.trip_id = pool_trips.id AND r.passenger_id = auth.uid()
  ));

CREATE POLICY "Admins view all pool trips" ON public.pool_trips
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers create own pool trips" ON public.pool_trips
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers update own pool trips" ON public.pool_trips
  FOR UPDATE TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Passengers manage own pool requests" ON public.pool_requests
  FOR SELECT TO authenticated USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers view requests on own trips" ON public.pool_requests
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pool_trips t WHERE t.id = pool_requests.trip_id AND t.driver_id = auth.uid()
  ));

CREATE POLICY "Admins view all pool requests" ON public.pool_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Passengers create own pool requests" ON public.pool_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers update own pool requests" ON public.pool_requests
  FOR UPDATE TO authenticated USING (auth.uid() = passenger_id) WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Drivers decide requests on own trips" ON public.pool_requests
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pool_trips t WHERE t.id = pool_requests.trip_id AND t.driver_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.pool_trips t WHERE t.id = pool_requests.trip_id AND t.driver_id = auth.uid()
  ));

CREATE TRIGGER pool_trips_updated_at BEFORE UPDATE ON public.pool_trips
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER pool_requests_updated_at BEFORE UPDATE ON public.pool_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- New trips always start with all seats free and cannot be backdated
CREATE OR REPLACE FUNCTION public.enforce_pool_trip_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.depart_at <= now() THEN
      RAISE EXCEPTION 'Departure time must be in the future';
    END IF;
    NEW.seats_available := NEW.seats_total;
    NEW.status := 'scheduled';
  ELSE
    NEW.seats_available := OLD.seats_available;
    NEW.driver_id := OLD.driver_id;
    NEW.seats_total := OLD.seats_total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pool_trips_guard BEFORE INSERT OR UPDATE ON public.pool_trips
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pool_trip_guard();

-- Validate joins and keep seat counts in sync
CREATE OR REPLACE FUNCTION public.enforce_pool_request_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.pool_trips;
BEGIN
  SELECT * INTO t FROM public.pool_trips WHERE id = NEW.trip_id FOR UPDATE;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Pool trip not found';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF t.driver_id = NEW.passenger_id THEN
      RAISE EXCEPTION 'You cannot join your own pool trip';
    END IF;
    IF t.status <> 'scheduled' OR t.depart_at <= now() THEN
      RAISE EXCEPTION 'This pool trip has already started or is closed';
    END IF;
    IF NEW.seats > t.seats_available THEN
      RAISE EXCEPTION 'Only % seat(s) left on this trip', t.seats_available;
    END IF;
    NEW.status := 'pending';
    NEW.fare_total := t.fare_per_seat * NEW.seats;
    RETURN NEW;
  END IF;

  -- immutable fields
  NEW.trip_id := OLD.trip_id;
  NEW.passenger_id := OLD.passenger_id;
  NEW.seats := OLD.seats;
  NEW.fare_total := OLD.fare_total;
  NEW.match_score := OLD.match_score;

  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('rejected','cancelled','completed') THEN
      RAISE EXCEPTION 'This request is already closed';
    END IF;
    IF NEW.status = 'confirmed' THEN
      IF auth.uid() <> t.driver_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only the trip driver can accept passengers';
      END IF;
      IF t.seats_available < OLD.seats THEN
        RAISE EXCEPTION 'Not enough seats left to accept this request';
      END IF;
      UPDATE public.pool_trips SET seats_available = seats_available - OLD.seats WHERE id = t.id;
    ELSIF NEW.status = 'rejected' THEN
      IF auth.uid() <> t.driver_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only the trip driver can reject passengers';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF OLD.status = 'confirmed' THEN
        UPDATE public.pool_trips SET seats_available = LEAST(seats_total, seats_available + OLD.seats) WHERE id = t.id;
      END IF;
      NEW.cancelled_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pool_requests_guard BEFORE INSERT OR UPDATE ON public.pool_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pool_request_guard();

-- Notifications reuse the existing helper
CREATE OR REPLACE FUNCTION public.tg_notify_pool_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.pool_trips;
BEGIN
  SELECT * INTO t FROM public.pool_trips WHERE id = NEW.trip_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(t.driver_id, 'New pooling request', 'A passenger wants to join your ride.', '/pooling/driver');
  ELSIF NEW.status <> OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.passenger_id, 'Pooling request accepted', 'Your seat is confirmed.', '/pooling/mine');
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.passenger_id, 'Pooling request declined', 'The driver could not take you along.', '/pooling/mine');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(
        CASE WHEN auth.uid() = NEW.passenger_id THEN t.driver_id ELSE NEW.passenger_id END,
        'Pooling booking cancelled', 'A pooling booking was cancelled.', '/pooling/mine');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pool_requests_notify AFTER INSERT OR UPDATE ON public.pool_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_pool_request();

REVOKE ALL ON FUNCTION public.enforce_pool_trip_guard() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_pool_request_guard() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_pool_request() FROM anon, authenticated;