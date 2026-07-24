
-- 1) Extend bookings with inspection fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_fuel_pct SMALLINT CHECK (pickup_fuel_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS return_fuel_pct SMALLINT CHECK (return_fuel_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS pickup_odometer INTEGER CHECK (pickup_odometer >= 0),
  ADD COLUMN IF NOT EXISTS return_odometer INTEGER CHECK (return_odometer >= 0),
  ADD COLUMN IF NOT EXISTS pickup_photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS return_photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_notes TEXT,
  ADD COLUMN IF NOT EXISTS return_notes TEXT,
  ADD COLUMN IF NOT EXISTS pickup_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_checked_at TIMESTAMPTZ;

-- 2) Extend disputes
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resolution TEXT;

-- 3) Storage policies on the private trip-photos bucket
-- Path convention: {bookingId}/pickup/... or {bookingId}/return/... or {bookingId}/dispute/...
CREATE OR REPLACE FUNCTION public.can_access_booking_folder(_folder TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = _folder
      AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin');
$$;

DROP POLICY IF EXISTS "trip photos read"   ON storage.objects;
DROP POLICY IF EXISTS "trip photos write"  ON storage.objects;
DROP POLICY IF EXISTS "trip photos update" ON storage.objects;
DROP POLICY IF EXISTS "trip photos delete" ON storage.objects;

CREATE POLICY "trip photos read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trip-photos' AND public.can_access_booking_folder((storage.foldername(name))[1]));

CREATE POLICY "trip photos write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trip-photos' AND public.can_access_booking_folder((storage.foldername(name))[1]));

CREATE POLICY "trip photos update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trip-photos' AND public.can_access_booking_folder((storage.foldername(name))[1]))
WITH CHECK (bucket_id = 'trip-photos' AND public.can_access_booking_folder((storage.foldername(name))[1]));

CREATE POLICY "trip photos delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trip-photos' AND public.can_access_booking_folder((storage.foldername(name))[1]));
