
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_admins(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_notify_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_driver_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_wash_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_vehicle_verification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_vendor_kyc() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_driver_verification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_profile_dl() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_dispute() FROM PUBLIC, anon, authenticated;
