
-- Enums
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dl_status AS ENUM ('none','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vehicles verification columns
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rc_url text,
  ADD COLUMN IF NOT EXISTS insurance_url text,
  ADD COLUMN IF NOT EXISTS pollution_url text,
  ADD COLUMN IF NOT EXISTS fitness_url text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Profiles DL columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dl_number text,
  ADD COLUMN IF NOT EXISTS dl_expiry date,
  ADD COLUMN IF NOT EXISTS dl_front_url text,
  ADD COLUMN IF NOT EXISTS dl_back_url text,
  ADD COLUMN IF NOT EXISTS dl_status public.dl_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dl_rejection_reason text,
  ADD COLUMN IF NOT EXISTS dl_verified_at timestamptz;

-- Reviews response / reporting
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS vendor_response text,
  ADD COLUMN IF NOT EXISTS vendor_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_reason text;

-- Messages image sharing
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;

-- Update public vehicle visibility (only approved & active vehicles are public)
DROP POLICY IF EXISTS "Active vehicles are public" ON public.vehicles;
CREATE POLICY "Active vehicles are public" ON public.vehicles FOR SELECT
  USING (
    (status = 'active' AND verification_status = 'approved')
    OR auth.uid() = vendor_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- Admin can update any profile (needed for DL approval)
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Vendor can update own reviews (to add response) -- add policy that vendors can update reviews on their vehicles' response fields
DROP POLICY IF EXISTS "Vendor responds to review" ON public.reviews;
CREATE POLICY "Vendor responds to review" ON public.reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = reviews.vehicle_id AND v.vendor_id = auth.uid()));

-- Any authenticated user can flag a review as reported (reporting)
DROP POLICY IF EXISTS "Authenticated report review" ON public.reviews;
CREATE POLICY "Authenticated report review" ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Notifications insert
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger: prevent booking when customer DL not approved or expired
CREATE OR REPLACE FUNCTION public.enforce_customer_dl_approved()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  SELECT dl_status, dl_expiry INTO p FROM public.profiles WHERE id = NEW.customer_id;
  IF p.dl_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Your driving licence must be approved before booking';
  END IF;
  IF p.dl_expiry IS NOT NULL AND p.dl_expiry < NEW.end_date THEN
    RAISE EXCEPTION 'Your driving licence expires before the booking end date';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_dl_check ON public.bookings;
CREATE TRIGGER trg_booking_dl_check
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_dl_approved();

-- Storage policies for verification-docs bucket
DROP POLICY IF EXISTS "verif docs read own" ON storage.objects;
CREATE POLICY "verif docs read own" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

DROP POLICY IF EXISTS "verif docs write own" ON storage.objects;
CREATE POLICY "verif docs write own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "verif docs update own" ON storage.objects;
CREATE POLICY "verif docs update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

DROP POLICY IF EXISTS "verif docs delete own" ON storage.objects;
CREATE POLICY "verif docs delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );
