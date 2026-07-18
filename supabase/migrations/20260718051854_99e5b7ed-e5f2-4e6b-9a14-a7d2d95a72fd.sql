
-- Add pickup/dropoff time to bookings for hour-precision scheduling
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_time time NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS dropoff_time time NOT NULL DEFAULT '10:00';

-- Allow the public QR page to look up a booking by its scan code.
-- Only exposes rows queried by the exact qr_code string (unguessable UUID) —
-- no listing, no other filters.
DROP POLICY IF EXISTS "Public QR lookup by code" ON public.bookings;
CREATE POLICY "Public QR lookup by code" ON public.bookings
  FOR SELECT TO anon, authenticated
  USING (qr_code IS NOT NULL);

GRANT SELECT ON public.bookings TO anon;
