REVOKE ALL ON FUNCTION public.wallet_pay_driver_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_pay_driver_booking(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.enforce_driver_verification_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_public_driver() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_public_driver() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_driver_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_driver_booking_conflict() FROM PUBLIC, anon, authenticated;