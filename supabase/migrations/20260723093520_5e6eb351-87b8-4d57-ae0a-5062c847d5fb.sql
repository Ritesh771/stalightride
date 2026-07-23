
-- Drop the security-definer views
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_vendors;

-- =====================================================
-- public_profiles: safe subset of profiles, synced by trigger
-- =====================================================
CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  city text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profile read" ON public.public_profiles FOR SELECT USING (true);

INSERT INTO public.public_profiles (id, full_name, avatar_url, city)
SELECT id, full_name, avatar_url, city FROM public.profiles
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      city = EXCLUDED.city;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_profiles (id, full_name, avatar_url, city, updated_at)
  VALUES (NEW.id, NEW.full_name, NEW.avatar_url, NEW.city, now())
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        city = EXCLUDED.city,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_public_profile
AFTER INSERT OR UPDATE OF full_name, avatar_url, city ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

CREATE OR REPLACE FUNCTION public.remove_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_remove_public_profile
AFTER DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.remove_public_profile();

-- =====================================================
-- public_vendors: safe subset of vendors, synced by trigger
-- =====================================================
CREATE TABLE public.public_vendors (
  id uuid PRIMARY KEY REFERENCES public.vendors(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  bio text,
  kyc_status kyc_status NOT NULL DEFAULT 'unsubmitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_vendors TO anon, authenticated;
GRANT ALL ON public.public_vendors TO service_role;

ALTER TABLE public.public_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public vendor read" ON public.public_vendors FOR SELECT USING (true);

INSERT INTO public.public_vendors (id, business_name, bio, kyc_status, created_at)
SELECT id, business_name, bio, kyc_status, created_at FROM public.vendors
ON CONFLICT (id) DO UPDATE
  SET business_name = EXCLUDED.business_name,
      bio = EXCLUDED.bio,
      kyc_status = EXCLUDED.kyc_status;

CREATE OR REPLACE FUNCTION public.sync_public_vendor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_vendors (id, business_name, bio, kyc_status, created_at, updated_at)
  VALUES (NEW.id, NEW.business_name, NEW.bio, NEW.kyc_status, NEW.created_at, now())
  ON CONFLICT (id) DO UPDATE
    SET business_name = EXCLUDED.business_name,
        bio = EXCLUDED.bio,
        kyc_status = EXCLUDED.kyc_status,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_public_vendor
AFTER INSERT OR UPDATE OF business_name, bio, kyc_status ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.sync_public_vendor();

CREATE OR REPLACE FUNCTION public.remove_public_vendor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_vendors WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_remove_public_vendor
AFTER DELETE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.remove_public_vendor();
