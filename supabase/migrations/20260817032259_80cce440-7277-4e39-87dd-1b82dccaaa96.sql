
CREATE OR REPLACE FUNCTION public.delete_my_account_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  open_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT count(*) INTO open_count FROM (
    SELECT 1 FROM public.bookings WHERE (customer_id = uid OR vendor_id = uid) AND status IN ('pending','confirmed')
    UNION ALL
    SELECT 1 FROM public.driver_bookings WHERE customer_id = uid AND status IN ('pending','confirmed')
    UNION ALL
    SELECT 1 FROM public.wash_bookings WHERE customer_id = uid AND status IN ('pending','confirmed')
  ) s;

  IF open_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'open_bookings', 'count', open_count);
  END IF;

  DELETE FROM public.wishlists WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;

  UPDATE public.profiles SET
    full_name = 'Deleted user',
    avatar_url = NULL,
    phone = NULL,
    city = NULL,
    dl_number = NULL,
    dl_expiry = NULL,
    dl_front_url = NULL,
    dl_back_url = NULL,
    dl_status = 'none',
    dl_rejection_reason = NULL,
    dl_verified_at = NULL,
    updated_at = now()
  WHERE id = uid;

  UPDATE public.vendors SET
    business_name = 'Deleted host',
    bio = NULL,
    payout_email = NULL,
    id_document_url = NULL,
    updated_at = now()
  WHERE id = uid;

  UPDATE public.vehicles SET status = 'paused', updated_at = now() WHERE vendor_id = uid;

  UPDATE public.drivers SET
    full_name = 'Deleted driver',
    phone = NULL,
    bio = NULL,
    photo_url = NULL,
    dl_number = NULL,
    dl_expiry = NULL,
    dl_front_url = NULL,
    dl_back_url = NULL,
    id_document_url = NULL,
    status = 'paused',
    updated_at = now()
  WHERE id = uid;

  UPDATE public.pool_trips SET status = 'cancelled', updated_at = now()
  WHERE driver_id = uid AND depart_at > now() AND status <> 'cancelled';

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account_data() TO authenticated;
