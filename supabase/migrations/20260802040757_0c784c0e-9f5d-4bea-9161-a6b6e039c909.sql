-- ============ WASH SERVICES CATALOGUE ============
CREATE TABLE public.wash_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  vehicle_category vehicle_category NOT NULL DEFAULT 'car',
  price numeric NOT NULL CHECK (price >= 0),
  duration_minutes integer NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wash_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wash_services TO authenticated;
GRANT ALL ON public.wash_services TO service_role;
ALTER TABLE public.wash_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active wash services" ON public.wash_services
  FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage wash services" ON public.wash_services
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update wash services" ON public.wash_services
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete wash services" ON public.wash_services
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wash_services_updated_at BEFORE UPDATE ON public.wash_services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ WASH PARTNERS (admin-only vendor directory) ============
CREATE TABLE public.wash_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_phone text,
  contact_email text,
  city text NOT NULL,
  daily_capacity integer NOT NULL DEFAULT 5 CHECK (daily_capacity > 0),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wash_vendors TO authenticated;
GRANT ALL ON public.wash_vendors TO service_role;
ALTER TABLE public.wash_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view wash partners" ON public.wash_vendors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert wash partners" ON public.wash_vendors
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update wash partners" ON public.wash_vendors
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete wash partners" ON public.wash_vendors
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wash_vendors_updated_at BEFORE UPDATE ON public.wash_vendors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ WASH BOOKINGS ============
CREATE TABLE public.wash_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.wash_services(id),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_label text,
  city text NOT NULL,
  address text NOT NULL,
  lat numeric,
  lng numeric,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  notes text,
  price numeric NOT NULL CHECK (price >= 0),
  status booking_status NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  assigned_vendor_id uuid REFERENCES public.wash_vendors(id) ON DELETE SET NULL,
  admin_note text,
  rejection_reason text,
  refund_amount numeric NOT NULL DEFAULT 0,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wash_bookings TO authenticated;
GRANT ALL ON public.wash_bookings TO service_role;
ALTER TABLE public.wash_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers and admins view wash bookings" ON public.wash_bookings
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers create own wash bookings" ON public.wash_bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins update wash bookings" ON public.wash_bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX wash_bookings_customer_idx ON public.wash_bookings(customer_id, created_at DESC);
CREATE INDEX wash_bookings_status_idx ON public.wash_bookings(status, slot_date);

CREATE TRIGGER wash_bookings_updated_at BEFORE UPDATE ON public.wash_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- New bookings always start pending/unpaid, priced from the catalogue (non-admin inserts)
CREATE OR REPLACE FUNCTION public.enforce_wash_booking_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s RECORD;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.wash_services WHERE id = NEW.service_id;
  IF s IS NULL OR NOT s.active THEN
    RAISE EXCEPTION 'This wash package is not available';
  END IF;
  IF NEW.slot_date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RAISE EXCEPTION 'Choose a slot in the future';
  END IF;

  NEW.price := s.price;
  NEW.status := 'pending';
  NEW.payment_status := 'unpaid';
  NEW.payment_method := NULL;
  NEW.paid_at := NULL;
  NEW.razorpay_order_id := NULL;
  NEW.razorpay_payment_id := NULL;
  NEW.assigned_vendor_id := NULL;
  NEW.admin_note := NULL;
  NEW.rejection_reason := NULL;
  NEW.refund_amount := 0;
  NEW.cancelled_at := NULL;
  NEW.cancelled_by := NULL;
  NEW.completed_at := NULL;
  RETURN NEW;
END; $$;

CREATE TRIGGER wash_bookings_guard BEFORE INSERT ON public.wash_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_wash_booking_guard();

-- ============ PAY WITH WALLET ============
CREATE OR REPLACE FUNCTION public.wallet_pay_wash_booking(_wash_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b RECORD; bal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO b FROM public.wash_bookings WHERE id = _wash_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Wash booking not found'; END IF;
  IF b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'Admin has not approved this wash yet'; END IF;
  IF b.payment_status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (b.customer_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id FOR UPDATE;
  IF bal < b.price THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  PERFORM public.wallet_apply(b.customer_id, -b.price, 'wash_payment', NULL, b.id::text, 'Payment for vehicle wash');

  UPDATE public.wash_bookings
     SET payment_status = 'paid', paid_at = now(), payment_method = 'wallet'
   WHERE id = b.id;

  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id;
  RETURN bal;
END; $$;

-- ============ ADMIN DECISION ============
CREATE OR REPLACE FUNCTION public.admin_decide_wash_booking(
  _wash_booking_id uuid,
  _decision text,
  _vendor_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b RECORD; refund numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _decision NOT IN ('confirmed','rejected','completed') THEN RAISE EXCEPTION 'Invalid decision'; END IF;

  SELECT * INTO b FROM public.wash_bookings WHERE id = _wash_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Wash booking not found'; END IF;

  IF _decision = 'confirmed' THEN
    IF _vendor_id IS NULL THEN RAISE EXCEPTION 'Assign a washer partner before approving'; END IF;
    UPDATE public.wash_bookings
       SET status = 'confirmed', assigned_vendor_id = _vendor_id,
           admin_note = NULLIF(btrim(COALESCE(_note,'')), ''), rejection_reason = NULL
     WHERE id = b.id;

  ELSIF _decision = 'rejected' THEN
    IF b.payment_status = 'paid' THEN
      refund := COALESCE(b.price, 0);
      PERFORM public.wallet_apply(b.customer_id, refund, 'wash_refund', NULL, b.id::text, 'Refund for rejected wash booking');
    END IF;
    UPDATE public.wash_bookings
       SET status = 'rejected',
           rejection_reason = NULLIF(btrim(COALESCE(_note,'')), ''),
           payment_status = CASE WHEN refund > 0 THEN 'refunded' ELSE b.payment_status END,
           refund_amount = refund,
           cancelled_at = now(), cancelled_by = auth.uid()
     WHERE id = b.id;

  ELSE
    IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'Only approved washes can be completed'; END IF;
    IF b.payment_status <> 'paid' THEN RAISE EXCEPTION 'Payment is still pending for this wash'; END IF;
    UPDATE public.wash_bookings
       SET status = 'completed', completed_at = now(),
           admin_note = COALESCE(NULLIF(btrim(COALESCE(_note,'')), ''), b.admin_note)
     WHERE id = b.id;
  END IF;
END; $$;

-- ============ CUSTOMER / ADMIN CANCELLATION WITH REFUND ============
CREATE OR REPLACE FUNCTION public.cancel_wash_booking(_wash_booking_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD; starts_at timestamptz; hours_left numeric; pct numeric := 0;
  refund numeric := 0; is_admin boolean; new_pay text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO b FROM public.wash_bookings WHERE id = _wash_booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Wash booking not found'; END IF;

  is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT is_admin AND b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF b.status IN ('cancelled','rejected','completed') THEN RAISE EXCEPTION 'This wash can no longer be cancelled'; END IF;

  starts_at := (b.slot_date::timestamp + b.slot_time) AT TIME ZONE 'Asia/Kolkata';
  hours_left := EXTRACT(EPOCH FROM (starts_at - now())) / 3600.0;

  IF b.payment_status = 'paid' THEN
    IF is_admin OR hours_left >= 24 THEN pct := 1;
    ELSIF hours_left >= 2 THEN pct := 0.5;
    ELSE pct := 0; END IF;
    refund := ROUND(COALESCE(b.price, 0) * pct, 2);
  END IF;

  IF refund > 0 THEN
    PERFORM public.wallet_apply(b.customer_id, refund, 'wash_refund', NULL, b.id::text,
      CASE WHEN pct = 1 THEN 'Full refund for cancelled wash' ELSE 'Partial refund for cancelled wash' END);
    new_pay := CASE WHEN pct = 1 THEN 'refunded' ELSE 'partially_refunded' END;
  ELSE
    new_pay := b.payment_status;
  END IF;

  UPDATE public.wash_bookings
     SET status = 'cancelled', payment_status = new_pay, refund_amount = refund,
         cancelled_at = now(), cancelled_by = auth.uid(),
         cancellation_reason = NULLIF(btrim(COALESCE(_reason,'')), '')
   WHERE id = b.id;

  RETURN jsonb_build_object('refund', refund, 'percent', pct * 100, 'payment_status', new_pay);
END; $$;

-- ============ SEED CATALOGUE + PARTNERS ============
INSERT INTO public.wash_services (name, description, vehicle_category, price, duration_minutes, sort_order) VALUES
  ('Bike Express Wash', 'Foam wash, chain degrease, tyre shine and hand dry for two-wheelers.', 'bike', 199, 30, 1),
  ('Scooter Sparkle Wash', 'Exterior foam wash, seat wipe-down and polish for scooters.', 'scooter', 179, 25, 2),
  ('Car Express Wash', 'Exterior foam wash, wheel clean, tyre dressing and hand dry.', 'car', 449, 45, 3),
  ('Car Interior + Exterior', 'Full exterior wash plus vacuum, dashboard polish and glass cleaning.', 'car', 899, 90, 4),
  ('Premium Ceramic Shine', 'Deep clean with ceramic spray sealant and 30-day gloss protection.', 'car', 1899, 150, 5),
  ('EV Care Wash', 'Waterless-safe wash for electric vehicles with port-safe detailing.', 'ev', 799, 75, 6);

INSERT INTO public.wash_vendors (name, contact_phone, city, daily_capacity, notes) VALUES
  ('ShinePro Detailers', '+91 90000 11111', 'Bengaluru', 8, 'Doorstep team, 2 washers available'),
  ('AquaFresh Wash Crew', '+91 90000 22222', 'Hyderabad', 6, 'Handles bikes and cars'),
  ('CeramicCare Studio', '+91 90000 33333', 'Mumbai', 4, 'Premium ceramic and detailing only');