REVOKE ALL ON FUNCTION public.enforce_vehicle_verification_guard() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Customer writes own review" ON public.reviews;
CREATE POLICY "Customer writes review after completed trip"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = reviews.booking_id
      AND b.vehicle_id = reviews.vehicle_id
      AND b.customer_id = auth.uid()
      AND b.status = 'completed'
  )
);