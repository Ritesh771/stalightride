-- 1. Scope policies to authenticated role explicitly
DROP POLICY IF EXISTS "Customer creates booking" ON public.bookings;
CREATE POLICY "Customer creates booking" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Parties read bookings" ON public.bookings;
CREATE POLICY "Parties read bookings" ON public.bookings FOR SELECT TO authenticated USING ((auth.uid() = customer_id) OR (auth.uid() = vendor_id) OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Parties update booking" ON public.bookings;
CREATE POLICY "Parties update booking" ON public.bookings FOR UPDATE TO authenticated USING ((auth.uid() = customer_id) OR (auth.uid() = vendor_id) OR has_role(auth.uid(), 'admin')) WITH CHECK ((auth.uid() = customer_id) OR (auth.uid() = vendor_id) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin updates dispute" ON public.disputes;
DROP POLICY IF EXISTS "Parties read disputes" ON public.disputes;
CREATE POLICY "Parties read disputes" ON public.disputes FOR SELECT TO authenticated USING ((raised_by = auth.uid()) OR has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = disputes.booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));
DROP POLICY IF EXISTS "User opens dispute" ON public.disputes;
CREATE POLICY "User opens dispute" ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid() = raised_by);

DROP POLICY IF EXISTS "Parties read messages" ON public.messages;
CREATE POLICY "Parties read messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));
DROP POLICY IF EXISTS "Parties send messages" ON public.messages;
CREATE POLICY "Parties send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));

DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Owner or admin reads profile" ON public.profiles;
CREATE POLICY "Owner or admin reads profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User reads own notifications" ON public.notifications;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User updates own notifications" ON public.notifications;
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own wishlist" ON public.wishlists;
CREATE POLICY "Own wishlist" ON public.wishlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customer deletes own review" ON public.reviews;
CREATE POLICY "Customer deletes own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Customer edits own review" ON public.reviews;
CREATE POLICY "Customer edits own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- 2. Vendor review response: add WITH CHECK + column guard trigger
DROP POLICY IF EXISTS "Vendor responds to review" ON public.reviews;
CREATE POLICY "Vendor responds to review" ON public.reviews FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_review_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') OR OLD.customer_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  -- Vendors may only change their public response fields
  NEW.id := OLD.id;
  NEW.booking_id := OLD.booking_id;
  NEW.vehicle_id := OLD.vehicle_id;
  NEW.customer_id := OLD.customer_id;
  NEW.rating := OLD.rating;
  NEW.comment := OLD.comment;
  NEW.created_at := OLD.created_at;
  NEW.reported := OLD.reported;
  NEW.report_reason := OLD.report_reason;
  IF NEW.vendor_response IS DISTINCT FROM OLD.vendor_response THEN
    NEW.vendor_response_at := now();
  ELSE
    NEW.vendor_response_at := OLD.vendor_response_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_review_update_scope ON public.reviews;
CREATE TRIGGER trg_enforce_review_update_scope
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_update_scope();

REVOKE ALL ON FUNCTION public.enforce_review_update_scope() FROM PUBLIC, anon, authenticated;