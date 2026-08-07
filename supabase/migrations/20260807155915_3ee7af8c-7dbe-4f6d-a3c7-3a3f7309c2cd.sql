-- 1. availability_blocks: only for live, approved vehicles (or owner/admin)
DROP POLICY IF EXISTS "Availability public read" ON public.availability_blocks;
CREATE POLICY "Availability read for listed vehicles"
ON public.availability_blocks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = availability_blocks.vehicle_id
      AND v.status = 'active'
      AND v.verification_status = 'approved'
  )
  OR EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = availability_blocks.vehicle_id AND v.vendor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. vehicle_images: only for live, approved vehicles (or owner/admin)
DROP POLICY IF EXISTS "Vehicle images public read" ON public.vehicle_images;
CREATE POLICY "Vehicle images read for listed vehicles"
ON public.vehicle_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_images.vehicle_id
      AND v.status = 'active'
      AND v.verification_status = 'approved'
  )
  OR EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_images.vehicle_id AND v.vendor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. reviews: only for live, approved vehicles (or author/owner/admin)
DROP POLICY IF EXISTS "Reviews public read" ON public.reviews;
CREATE POLICY "Reviews read for listed vehicles"
ON public.reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = reviews.vehicle_id
      AND v.status = 'active'
      AND v.verification_status = 'approved'
  )
  OR customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. booking_locations: strict participant-only access (realtime honours RLS)
REVOKE ALL ON public.booking_locations FROM anon;
DROP POLICY IF EXISTS "Customer inserts own location" ON public.booking_locations;
CREATE POLICY "Participants insert own location"
ON public.booking_locations FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_locations.booking_id
      AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())
  )
);

-- 5. notifications: system-generated only, no direct client inserts
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM anon, authenticated;

-- 6. internal helper functions must not be directly callable by clients
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.can_access_booking_folder(text) FROM anon, authenticated, public;