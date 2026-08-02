-- Money/state-changing RPCs: signed-in users only (RLS/ownership checks stay inside each function)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.wallet_pay_wash_booking(uuid)',
    'public.admin_decide_wash_booking(uuid, text, uuid, text)',
    'public.cancel_wash_booking(uuid, text)',
    'public.wallet_pay_booking(uuid)',
    'public.wallet_pay_driver_booking(uuid)',
    'public.cancel_driver_booking(uuid, text)',
    'public.report_review(uuid, text)',
    'public.wallet_apply(uuid, numeric, text, uuid, text, text)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.wallet_pay_wash_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_wash_booking(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_wash_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_driver_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_driver_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO authenticated;
-- wallet_apply is an internal ledger helper: service role only
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid, numeric, text, uuid, text, text) TO service_role;