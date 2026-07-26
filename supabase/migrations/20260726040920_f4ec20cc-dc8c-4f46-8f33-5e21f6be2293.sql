CREATE OR REPLACE FUNCTION public.enforce_vehicle_verification_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verification_status = 'approved' AND OLD IS DISTINCT FROM NULL THEN
      NEW.verified_at = COALESCE(NEW.verified_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.status := 'draft';
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;

  NEW.verification_status := OLD.verification_status;
  NEW.verified_at := OLD.verified_at;
  NEW.rejection_reason := OLD.rejection_reason;

  IF OLD.verification_status IS DISTINCT FROM 'approved' AND NEW.status = 'active' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vehicle_verification_guard ON public.vehicles;
CREATE TRIGGER trg_enforce_vehicle_verification_guard
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_verification_guard();