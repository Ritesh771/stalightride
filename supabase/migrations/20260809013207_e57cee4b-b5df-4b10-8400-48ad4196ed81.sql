-- Helper: true when the statement runs through PostgREST as a normal end user
-- (SECURITY DEFINER RPCs and the service role run as other roles and are exempt).
CREATE OR REPLACE FUNCTION public.is_end_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_user IN ('authenticated', 'anon');
$$;

REVOKE ALL ON FUNCTION public.is_end_user_request() FROM PUBLIC;

-- ============ bookings ============
CREATE OR REPLACE FUNCTION public.enforce_booking_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  -- Immutable identity / schedule / money / payment / handover columns
  NEW.id := OLD.id;
  NEW.vehicle_id := OLD.vehicle_id;
  NEW.vendor_id := OLD.vendor_id;
  NEW.customer_id := OLD.customer_id;
  NEW.start_date := OLD.start_date;
  NEW.end_date := OLD.end_date;
  NEW.pickup_time := OLD.pickup_time;
  NEW.dropoff_time := OLD.dropoff_time;
  NEW.base_price := OLD.base_price;
  NEW.security_deposit := OLD.security_deposit;
  NEW.discount := OLD.discount;
  NEW.total_price := OLD.total_price;
  NEW.coupon_code := OLD.coupon_code;
  NEW.payment_status := OLD.payment_status;
  NEW.payment_method := OLD.payment_method;
  NEW.razorpay_order_id := OLD.razorpay_order_id;
  NEW.razorpay_payment_id := OLD.razorpay_payment_id;
  NEW.paid_at := OLD.paid_at;
  NEW.qr_code := OLD.qr_code;
  NEW.pickup_checked_at := OLD.pickup_checked_at;
  NEW.return_checked_at := OLD.return_checked_at;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_booking_update_scope ON public.bookings;
CREATE TRIGGER trg_enforce_booking_update_scope
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update_scope();

-- ============ driver_bookings ============
CREATE OR REPLACE FUNCTION public.enforce_driver_booking_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  NEW.id := OLD.id;
  NEW.driver_id := OLD.driver_id;
  NEW.customer_id := OLD.customer_id;
  NEW.booking_id := OLD.booking_id;
  NEW.rate_type := OLD.rate_type;
  NEW.start_date := OLD.start_date;
  NEW.end_date := OLD.end_date;
  NEW.start_time := OLD.start_time;
  NEW.end_time := OLD.end_time;
  NEW.hours := OLD.hours;
  NEW.days := OLD.days;
  NEW.total_price := OLD.total_price;
  NEW.payment_status := OLD.payment_status;
  NEW.payment_method := OLD.payment_method;
  NEW.razorpay_order_id := OLD.razorpay_order_id;
  NEW.razorpay_payment_id := OLD.razorpay_payment_id;
  NEW.paid_at := OLD.paid_at;
  NEW.refund_amount := OLD.refund_amount;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_driver_booking_update_scope ON public.driver_bookings;
CREATE TRIGGER trg_enforce_driver_booking_update_scope
BEFORE UPDATE ON public.driver_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_booking_update_scope();

-- ============ driver_reviews ============
CREATE OR REPLACE FUNCTION public.enforce_driver_review_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') OR OLD.customer_id = auth.uid() THEN RETURN NEW; END IF;

  -- The reviewed driver may only write a public response.
  IF NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.comment IS DISTINCT FROM OLD.comment
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
     OR NEW.driver_booking_id IS DISTINCT FROM OLD.driver_booking_id THEN
    RAISE EXCEPTION 'Drivers can only add a response to a review';
  END IF;

  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  IF NEW.driver_response IS DISTINCT FROM OLD.driver_response THEN
    NEW.driver_response_at := now();
  ELSE
    NEW.driver_response_at := OLD.driver_response_at;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_driver_review_update_scope ON public.driver_reviews;
CREATE TRIGGER trg_enforce_driver_review_update_scope
BEFORE UPDATE ON public.driver_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_review_update_scope();

-- ============ reviews: make vendor tampering an explicit failure ============
CREATE OR REPLACE FUNCTION public.enforce_review_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') OR OLD.customer_id = auth.uid() THEN RETURN NEW; END IF;

  -- Vendors may only change their public response fields.
  IF NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.comment IS DISTINCT FROM OLD.comment
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
     OR NEW.reported IS DISTINCT FROM OLD.reported
     OR NEW.report_reason IS DISTINCT FROM OLD.report_reason THEN
    RAISE EXCEPTION 'Hosts can only add a response to a review';
  END IF;

  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  IF NEW.vendor_response IS DISTINCT FROM OLD.vendor_response THEN
    NEW.vendor_response_at := now();
  ELSE
    NEW.vendor_response_at := OLD.vendor_response_at;
  END IF;

  RETURN NEW;
END; $$;