DROP POLICY IF EXISTS "User opens dispute" ON public.disputes;
CREATE POLICY "User opens dispute" ON public.disputes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = raised_by
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = disputes.booking_id
        AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())
    )
  )
);