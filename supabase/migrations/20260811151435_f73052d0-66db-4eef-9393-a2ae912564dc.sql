-- 1) The hire guard read public.drivers as the calling customer, who has no direct
-- SELECT grant on that table (customers read public_drivers). The lookup returned
-- NULL and every hire was rejected with "This driver is not available for hire".
CREATE OR REPLACE FUNCTION public.prevent_driver_booking_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d RECORD;
BEGIN
  SELECT verification_status, status INTO d FROM public.drivers WHERE id = NEW.driver_id;
  IF d IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;
  IF d.verification_status IS DISTINCT FROM 'approved' OR d.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'This driver is not available for hire';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.driver_bookings b
    WHERE b.driver_id = NEW.driver_id
      AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.status IN ('pending','confirmed')
      AND b.start_date <= NEW.end_date
      AND b.end_date >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Driver is already booked for the selected dates';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_driver_booking_conflict() FROM anon, authenticated;

-- 2) Wallet payments for driver hires and washes inserted ledger kinds that the
-- CHECK constraint rejected, so every wallet payment failed at the last step.
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_kind_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_kind_check
  CHECK (kind = ANY (ARRAY[
    'topup','booking_payment','booking_earning','refund','payout','adjustment',
    'driver_payment','driver_earning','driver_refund','driver_refund_reversal',
    'wash_payment','wash_refund'
  ]));