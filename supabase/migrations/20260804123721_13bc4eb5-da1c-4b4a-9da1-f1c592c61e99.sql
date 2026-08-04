CREATE OR REPLACE FUNCTION public.booked_vehicle_ids(_start date, _end date)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.vehicle_id
  FROM public.bookings b
  WHERE b.status IN ('pending','confirmed')
    AND b.start_date <= _end
    AND b.end_date >= _start
  UNION
  SELECT DISTINCT a.vehicle_id
  FROM public.availability_blocks a
  WHERE a.start_date <= _end
    AND a.end_date >= _start;
$$;

REVOKE ALL ON FUNCTION public.booked_vehicle_ids(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booked_vehicle_ids(date, date) TO anon, authenticated;