
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('customer', 'vendor', 'admin');
CREATE TYPE public.vehicle_category AS ENUM ('scooter', 'bike', 'motorcycle', 'car', 'ev');
CREATE TYPE public.fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'none');
CREATE TYPE public.transmission_type AS ENUM ('manual', 'automatic', 'none');
CREATE TYPE public.vehicle_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
CREATE TYPE public.kyc_status AS ENUM ('unsubmitted', 'pending', 'approved', 'rejected');

-- =========== updated_at helper ===========
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Register signup trigger AFTER user_roles exists
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== VENDORS ===========
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  bio TEXT,
  id_document_url TEXT,
  kyc_status kyc_status NOT NULL DEFAULT 'unsubmitted',
  payout_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors public read" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendor manages self" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Vendor updates self" ON public.vendors FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========== VEHICLES ===========
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category vehicle_category NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  fuel fuel_type NOT NULL DEFAULT 'petrol',
  transmission transmission_type NOT NULL DEFAULT 'manual',
  mileage_kmpl NUMERIC,
  seats INT,
  city TEXT NOT NULL,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  description TEXT,
  price_hourly NUMERIC,
  price_daily NUMERIC NOT NULL,
  price_weekly NUMERIC,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'draft',
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_city_idx ON public.vehicles(city);
CREATE INDEX vehicles_category_idx ON public.vehicles(category);
CREATE INDEX vehicles_status_idx ON public.vehicles(status);
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active vehicles are public" ON public.vehicles FOR SELECT USING (status = 'active' OR auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Vendor inserts own vehicle" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendor updates own vehicle" ON public.vehicles FOR UPDATE USING (auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Vendor deletes own vehicle" ON public.vehicles FOR DELETE USING (auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========== VEHICLE IMAGES ===========
CREATE TABLE public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_images TO authenticated;
GRANT ALL ON public.vehicle_images TO service_role;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicle images public read" ON public.vehicle_images FOR SELECT USING (true);
CREATE POLICY "Vendor manages images" ON public.vehicle_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.vendor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.vendor_id = auth.uid()));

-- =========== AVAILABILITY BLOCKS ===========
CREATE TABLE public.availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.availability_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_blocks TO authenticated;
GRANT ALL ON public.availability_blocks TO service_role;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Availability public read" ON public.availability_blocks FOR SELECT USING (true);
CREATE POLICY "Vendor manages availability" ON public.availability_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.vendor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.vendor_id = auth.uid()));

-- =========== BOOKINGS ===========
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  base_price NUMERIC NOT NULL,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL,
  coupon_code TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  qr_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX bookings_customer_idx ON public.bookings(customer_id);
CREATE INDEX bookings_vendor_idx ON public.bookings(vendor_id);
CREATE INDEX bookings_vehicle_dates_idx ON public.bookings(vehicle_id, start_date, end_date);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read bookings" ON public.bookings FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customer creates booking" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Parties update booking" ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Conflict prevention trigger
CREATE OR REPLACE FUNCTION public.prevent_booking_conflict() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.vehicle_id = NEW.vehicle_id
      AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.status IN ('pending','confirmed')
      AND b.start_date <= NEW.end_date
      AND b.end_date >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Vehicle not available for selected dates';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.availability_blocks a
    WHERE a.vehicle_id = NEW.vehicle_id
      AND a.start_date <= NEW.end_date
      AND a.end_date >= NEW.start_date
  ) THEN
    RAISE EXCEPTION 'Vehicle is blocked on selected dates';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER prevent_booking_conflict_ins BEFORE INSERT ON public.bookings
  FOR EACH ROW WHEN (NEW.status IN ('pending','confirmed'))
  EXECUTE FUNCTION public.prevent_booking_conflict();

-- =========== REVIEWS ===========
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customer writes own review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer edits own review" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Customer deletes own review" ON public.reviews FOR DELETE USING (auth.uid() = customer_id);

-- Recompute rating on review changes
CREATE OR REPLACE FUNCTION public.recompute_vehicle_rating() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE vid UUID;
BEGIN
  vid := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  UPDATE public.vehicles SET
    avg_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE vehicle_id = vid), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE vehicle_id = vid)
  WHERE id = vid;
  RETURN NEW;
END; $$;
CREATE TRIGGER reviews_recompute AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_vehicle_rating();

-- =========== MESSAGES ===========
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_booking_idx ON public.messages(booking_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));
CREATE POLICY "Parties send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =========== NOTIFICATIONS ===========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- =========== COUPONS ===========
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  percent_off INT CHECK (percent_off BETWEEN 0 AND 100),
  amount_off NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active coupons readable" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========== WISHLISTS ===========
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== DISPUTES ===========
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read disputes" ON public.disputes FOR SELECT
  USING (raised_by = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())));
CREATE POLICY "User opens dispute" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "Admin updates dispute" ON public.disputes FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========== PAYOUTS ===========
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own payouts" ON public.payouts FOR SELECT
  USING (auth.uid() = vendor_id OR public.has_role(auth.uid(),'admin'));
