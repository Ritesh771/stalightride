
-- 1. Fix RLS by making sync triggers SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.sync_public_vendor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.public_vendors (id, business_name, bio, kyc_status, created_at, updated_at)
  VALUES (NEW.id, NEW.business_name, NEW.bio, NEW.kyc_status, NEW.created_at, now())
  ON CONFLICT (id) DO UPDATE SET business_name = EXCLUDED.business_name, bio = EXCLUDED.bio, kyc_status = EXCLUDED.kyc_status, updated_at = now();
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_public_vendor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.public_vendors WHERE id = OLD.id; RETURN OLD; END; $$;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.public_profiles (id, full_name, avatar_url, city, updated_at)
  VALUES (NEW.id, NEW.full_name, NEW.avatar_url, NEW.city, now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url, city = EXCLUDED.city, updated_at = now();
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.public_profiles WHERE id = OLD.id; RETURN OLD; END; $$;

-- 2. Live GPS tracking table
CREATE TABLE IF NOT EXISTS public.booking_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_locations_booking_created ON public.booking_locations(booking_id, created_at DESC);

GRANT SELECT, INSERT ON public.booking_locations TO authenticated;
GRANT ALL ON public.booking_locations TO service_role;
ALTER TABLE public.booking_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read booking locations" ON public.booking_locations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.vendor_id = auth.uid())) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Customer inserts own location" ON public.booking_locations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_locations;

-- 3. Damage checklist columns on bookings (JSON array of {area, condition, note})
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_damage JSONB,
  ADD COLUMN IF NOT EXISTS return_damage JSONB;

-- 4. Dispute resolution workflow
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
-- status column expected to already exist; ensure default
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='disputes' AND column_name='status') THEN
    ALTER TABLE public.disputes ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
  END IF;
END $$;

-- Allow admins to update disputes for resolution
DROP POLICY IF EXISTS "Admins resolve disputes" ON public.disputes;
CREATE POLICY "Admins resolve disputes" ON public.disputes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
