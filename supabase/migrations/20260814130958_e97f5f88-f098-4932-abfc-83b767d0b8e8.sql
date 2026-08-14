CREATE OR REPLACE FUNCTION public.enforce_pool_trip_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.depart_at <= now() THEN
      RAISE EXCEPTION 'Departure time must be in the future';
    END IF;
    NEW.seats_available := NEW.seats_total;
    NEW.status := 'scheduled';
  ELSE
    NEW.driver_id := OLD.driver_id;
    NEW.seats_total := OLD.seats_total;
    -- Seat counts may only change through the pool-request workflow.
    IF coalesce(current_setting('app.pool_seat_sync', true), '') <> '1' THEN
      NEW.seats_available := OLD.seats_available;
    ELSE
      NEW.seats_available := GREATEST(0, LEAST(NEW.seats_total, NEW.seats_available));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pool_request_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      PERFORM set_config('app.pool_seat_sync', '1', true);
      UPDATE public.pool_trips SET seats_available = seats_available - OLD.seats WHERE id = t.id;
      PERFORM set_config('app.pool_seat_sync', '0', true);
    ELSIF NEW.status = 'rejected' THEN
      IF auth.uid() <> t.driver_id AND NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only the trip driver can reject passengers';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF OLD.status = 'confirmed' THEN
        PERFORM set_config('app.pool_seat_sync', '1', true);
        UPDATE public.pool_trips SET seats_available = LEAST(t.seats_total, t.seats_available + OLD.seats) WHERE id = t.id;
        PERFORM set_config('app.pool_seat_sync', '0', true);
      END IF;
      NEW.cancelled_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_pool_trip_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pool_request_guard() FROM PUBLIC, anon, authenticated;