
-- 1. bookings: server function already handles QR lookups via admin client
DROP POLICY IF EXISTS "Public QR lookup by code" ON public.bookings;

-- 2. coupons: authenticated only
DROP POLICY IF EXISTS "Active coupons readable" ON public.coupons;
CREATE POLICY "Active coupons readable" ON public.coupons
  FOR SELECT TO authenticated USING (active = true);
REVOKE SELECT ON public.coupons FROM anon;

-- 3. profiles: restrict to owner + admin; expose safe fields via view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Owner or admin reads profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, city FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. vendors: restrict to owner + admin; expose safe fields via view
DROP POLICY IF EXISTS "Vendors public read" ON public.vendors;
CREATE POLICY "Owner or admin reads vendor" ON public.vendors
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.public_vendors
WITH (security_invoker = false) AS
SELECT id, business_name, bio, kyc_status, created_at FROM public.vendors;
GRANT SELECT ON public.public_vendors TO anon, authenticated;

-- 5. reviews: replace broad update with a narrow report RPC
DROP POLICY IF EXISTS "Authenticated report review" ON public.reviews;

CREATE OR REPLACE FUNCTION public.report_review(_review_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason required';
  END IF;
  UPDATE public.reviews
    SET reported = true,
        report_reason = left(btrim(_reason), 500)
    WHERE id = _review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.report_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO authenticated;
