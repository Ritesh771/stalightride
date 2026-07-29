-- =========================
-- DRIVERS
-- =========================
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  bio TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  languages TEXT[] NOT NULL DEFAULT '{}',
  vehicle_types TEXT[] NOT NULL DEFAULT '{}',
  photo_url TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  daily_rate NUMERIC NOT NULL,
  dl_number TEXT,
  dl_expiry DATE,
  dl_front_url TEXT,
  dl_back_url TEXT,
  id_document_url TEXT,
  status vehicle_status NOT NULL DEFAULT 'draft',
  verification_status verification_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own profile" ON public.drivers
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins manage drivers" ON public.drivers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Verification guard: non-admins can never self-approve
CREATE OR REPLACE FUNCTION public.enforce_driver_verification_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verification_status = 'approved' THEN
      NEW.verified_at = COALESCE(NEW.verified_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.status := 'draft';
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.avg_rating := 0;
    NEW.review_count := 0;
    RETURN NEW;
  END IF;

  -- Re-submitting documents sends the profile back for review
  IF (NEW.dl_front_url IS DISTINCT FROM OLD.dl_front_url)
     OR (NEW.dl_back_url IS DISTINCT FROM OLD.dl_back_url)
     OR (NEW.id_document_url IS DISTINCT FROM OLD.id_document_url)
     OR (NEW.dl_number IS DISTINCT FROM OLD.dl_number) THEN
    NEW.verification_status := 'pending';
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
  ELSE
    NEW.verification_status := OLD.verification_status;
    NEW.verified_at := OLD.verified_at;
    NEW.rejection_reason := OLD.rejection_reason;
  END IF;

  NEW.avg_rating := OLD.avg_rating;
  NEW.review_count := OLD.review_count;

  IF NEW.verification_status IS DISTINCT FROM 'approved' AND NEW.status = 'active' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_drivers_verification_guard BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_verification_guard();

-- =========================
-- PUBLIC DRIVERS (safe directory)
-- =========================
CREATE TABLE public.public_drivers (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  bio TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  languages TEXT[] NOT NULL DEFAULT '{}',
  vehicle_types TEXT[] NOT NULL DEFAULT '{}',
  photo_url TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  daily_rate NUMERIC NOT NULL,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_drivers TO anon, authenticated;
GRANT ALL ON public.public_drivers TO service_role;
ALTER TABLE public.public_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public drivers are viewable by everyone" ON public.public_drivers
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_driver()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verification_status = 'approved' AND NEW.status = 'active' THEN
    INSERT INTO public.public_drivers (id, full_name, city, bio, experience_years, languages, vehicle_types, photo_url, hourly_rate, daily_rate, avg_rating, review_count, created_at, updated_at)
    VALUES (NEW.id, NEW.full_name, NEW.city, NEW.bio, NEW.experience_years, NEW.languages, NEW.vehicle_types, NEW.photo_url, NEW.hourly_rate, NEW.daily_rate, NEW.avg_rating, NEW.review_count, NEW.created_at, now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, city = EXCLUDED.city, bio = EXCLUDED.bio,
      experience_years = EXCLUDED.experience_years, languages = EXCLUDED.languages,
      vehicle_types = EXCLUDED.vehicle_types, photo_url = EXCLUDED.photo_url,
      hourly_rate = EXCLUDED.hourly_rate, daily_rate = EXCLUDED.daily_rate,
      avg_rating = EXCLUDED.avg_rating, review_count = EXCLUDED.review_count, updated_at = now();
  ELSE
    DELETE FROM public.public_drivers WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_public_driver()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.public_drivers WHERE id = OLD.id; RETURN OLD; END; $$;

CREATE TRIGGER trg_sync_public_driver AFTER INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_driver();
CREATE TRIGGER trg_remove_public_driver AFTER DELETE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.remove_public_driver();

-- =========================
-- DRIVER BOOKINGS
-- =========================
CREATE TABLE public.driver_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rate_type TEXT NOT NULL DEFAULT 'daily' CHECK (rate_type IN ('hourly','daily')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  hours NUMERIC NOT NULL DEFAULT 0,
  days INTEGER NOT NULL DEFAULT 1,
  pickup_address TEXT,
  notes TEXT,
  total_price NUMERIC NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE ON public.driver_bookings TO authenticated;
GRANT ALL ON public.driver_bookings TO service_role;
ALTER TABLE public.driver_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own driver bookings" ON public.driver_bookings
  FOR SELECT TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customers create driver bookings" ON public.driver_bookings
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Parties update driver bookings" ON public.driver_bookings
  FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (customer_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_driver_bookings_driver ON public.driver_bookings(driver_id, start_date, end_date);
CREATE INDEX idx_driver_bookings_customer ON public.driver_bookings(customer_id);

CREATE TRIGGER trg_driver_bookings_updated_at BEFORE UPDATE ON public.driver_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_driver_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d RECORD;
BEGIN
  SELECT verification_status, status INTO d FROM public.drivers WHERE id = NEW.driver_id;
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
END; $$;

CREATE TRIGGER trg_prevent_driver_booking_conflict BEFORE INSERT ON public.driver_bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_booking_conflict();

-- =========================
-- DRIVER REVIEWS
-- =========================
CREATE TABLE public.driver_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_booking_id UUID NOT NULL UNIQUE REFERENCES public.driver_bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  driver_response TEXT,
  driver_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_reviews TO authenticated;
GRANT SELECT ON public.driver_reviews TO anon;
GRANT ALL ON public.driver_reviews TO service_role;
ALTER TABLE public.driver_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver reviews are public" ON public.driver_reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Customers write reviews for completed hires" ON public.driver_reviews
  FOR INSERT TO authenticated WITH CHECK (
    customer_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.driver_bookings b
      WHERE b.id = driver_booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
    )
  );
CREATE POLICY "Authors and drivers update reviews" ON public.driver_reviews
  FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR driver_id = auth.uid());

CREATE OR REPLACE FUNCTION public.recompute_driver_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE did UUID;
BEGIN
  did := COALESCE(NEW.driver_id, OLD.driver_id);
  UPDATE public.drivers SET
    avg_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.driver_reviews WHERE driver_id = did), 0),
    review_count = (SELECT COUNT(*) FROM public.driver_reviews WHERE driver_id = did)
  WHERE id = did;
  UPDATE public.public_drivers SET
    avg_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.driver_reviews WHERE driver_id = did), 0),
    review_count = (SELECT COUNT(*) FROM public.driver_reviews WHERE driver_id = did)
  WHERE id = did;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_recompute_driver_rating AFTER INSERT OR UPDATE OR DELETE ON public.driver_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_driver_rating();

-- =========================
-- WALLET PAYMENT FOR DRIVER HIRE
-- =========================
CREATE OR REPLACE FUNCTION public.wallet_pay_driver_booking(_driver_booking_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; bal NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO b FROM public.driver_bookings WHERE id = _driver_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'Driver has not accepted this request yet'; END IF;
  IF b.payment_status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (b.customer_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id FOR UPDATE;
  IF bal < b.total_price THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  PERFORM public.wallet_apply(b.customer_id, -b.total_price, 'driver_payment', NULL, b.id::text, 'Payment for driver hire');
  IF b.driver_id <> b.customer_id THEN
    PERFORM public.wallet_apply(b.driver_id, b.total_price, 'driver_earning', NULL, b.id::text, 'Earning from driver hire');
  END IF;

  UPDATE public.driver_bookings
    SET payment_status = 'paid', paid_at = now(), payment_method = 'wallet'
    WHERE id = b.id;

  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id;
  RETURN bal;
END; $$;