-- Defence in depth: keep the column-scope guards on review updates and make sure
-- they always run (even for replication/admin-owner sessions of end users).
DROP TRIGGER IF EXISTS trg_enforce_review_update_scope ON public.reviews;
CREATE TRIGGER trg_enforce_review_update_scope
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_update_scope();

DROP TRIGGER IF EXISTS trg_enforce_driver_review_update_scope ON public.driver_reviews;
CREATE TRIGGER trg_enforce_driver_review_update_scope
  BEFORE UPDATE ON public.driver_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_review_update_scope();

-- Narrow the update policies to the exact actors, so only the review author,
-- the responding host/driver, or an admin can update at all; the triggers above
-- then restrict hosts/drivers to their response columns only.
DROP POLICY IF EXISTS "Vendor responds to review" ON public.reviews;
CREATE POLICY "Vendor responds to review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid())
    AND vendor_response IS NOT NULL
  );

DROP POLICY IF EXISTS "Authors and drivers update reviews" ON public.driver_reviews;
CREATE POLICY "Authors update own driver reviews"
  ON public.driver_reviews FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers reply to their reviews"
  ON public.driver_reviews FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() AND driver_response IS NOT NULL);

COMMENT ON FUNCTION public.enforce_review_update_scope() IS
  'Blocks hosts from changing a customer review rating/comment/report fields; only vendor_response(_at) may change.';
COMMENT ON FUNCTION public.enforce_driver_review_update_scope() IS
  'Blocks drivers from changing a customer review rating/comment; only driver_response(_at) may change.';