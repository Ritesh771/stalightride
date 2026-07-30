ALTER TABLE public.driver_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.cancel_driver_booking(_driver_booking_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
  starts_at TIMESTAMPTZ;
  hours_left NUMERIC;
  pct NUMERIC := 0;
  refund NUMERIC := 0;
  is_driver BOOLEAN;
  new_pay_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO b FROM public.driver_bookings WHERE id = _driver_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Hire not found'; END IF;

  is_driver := (b.driver_id = auth.uid());
  IF NOT is_driver AND b.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your booking';
  END IF;

  IF b.status IN ('cancelled','rejected','completed') THEN
    RAISE EXCEPTION 'This hire can no longer be cancelled';
  END IF;

  starts_at := (b.start_date::timestamp + b.start_time) AT TIME ZONE 'Asia/Kolkata';
  hours_left := EXTRACT(EPOCH FROM (starts_at - now())) / 3600.0;

  IF b.payment_status = 'paid' THEN
    IF is_driver THEN
      pct := 1;
    ELSIF hours_left >= 24 THEN
      pct := 1;
    ELSIF hours_left >= 2 THEN
      pct := 0.5;
    ELSE
      pct := 0;
    END IF;
    refund := ROUND(COALESCE(b.total_price,0) * pct, 2);
  END IF;

  IF refund > 0 THEN
    IF b.driver_id <> b.customer_id THEN
      PERFORM public.wallet_apply(b.driver_id, -refund, 'driver_refund_reversal', NULL, b.id::text,
        CASE WHEN pct = 1 THEN 'Refund to customer (hire cancelled)' ELSE 'Partial refund to customer (hire cancelled)' END);
    END IF;
    PERFORM public.wallet_apply(b.customer_id, refund, 'driver_refund', NULL, b.id::text,
      CASE WHEN pct = 1 THEN 'Full refund for cancelled driver hire' ELSE 'Partial refund for cancelled driver hire' END);
    new_pay_status := CASE WHEN pct = 1 THEN 'refunded' ELSE 'partially_refunded' END;
  ELSE
    new_pay_status := b.payment_status;
  END IF;

  UPDATE public.driver_bookings
    SET status = 'cancelled',
        payment_status = new_pay_status,
        refund_amount = refund,
        cancelled_at = now(),
        cancelled_by = auth.uid(),
        cancellation_reason = NULLIF(btrim(COALESCE(_reason,'')), '')
  WHERE id = b.id;

  RETURN jsonb_build_object(
    'refund', refund,
    'percent', pct * 100,
    'payment_status', new_pay_status,
    'cancelled_by_driver', is_driver
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_driver_booking(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_driver_booking(uuid, text) TO authenticated;