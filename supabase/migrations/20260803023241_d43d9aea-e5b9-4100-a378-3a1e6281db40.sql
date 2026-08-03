-- 1. Coupons: stop bulk enumeration of active promo codes
DROP POLICY IF EXISTS "Active coupons readable" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;
REVOKE SELECT ON public.coupons FROM authenticated;
GRANT ALL ON public.coupons TO service_role;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'valid', true,
       'code', c.code,
       'percent_off', c.percent_off,
       'amount_off', c.amount_off)
     FROM public.coupons c
     WHERE upper(btrim(c.code)) = upper(btrim(_code))
       AND c.active
       AND (c.starts_at IS NULL OR c.starts_at <= now())
       AND (c.ends_at IS NULL OR c.ends_at >= now())
     LIMIT 1),
    jsonb_build_object('valid', false)
  );
$$;

-- 2. Lock down every SECURITY DEFINER routine in the exposed schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Trigger / internal-only routines stay callable by nobody but the engine + service role
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid, numeric, text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO service_role;

-- Re-grant only what the app must call as a signed-in user
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_booking_folder(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_driver_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_wash_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_driver_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_wash_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_wash_booking(uuid, text, uuid, text) TO authenticated;