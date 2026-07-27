CREATE OR REPLACE FUNCTION public.enforce_vendor_kyc_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.kyc_status := CASE WHEN NEW.id_document_url IS NULL THEN 'unsubmitted'::kyc_status ELSE 'pending'::kyc_status END;
    RETURN NEW;
  END IF;

  IF NEW.id_document_url IS DISTINCT FROM OLD.id_document_url AND NEW.id_document_url IS NOT NULL THEN
    NEW.kyc_status := 'pending'::kyc_status;
  ELSE
    NEW.kyc_status := OLD.kyc_status;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_vendor_kyc_guard() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vendor_kyc_guard ON public.vendors;
CREATE TRIGGER trg_vendor_kyc_guard
BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.enforce_vendor_kyc_guard();