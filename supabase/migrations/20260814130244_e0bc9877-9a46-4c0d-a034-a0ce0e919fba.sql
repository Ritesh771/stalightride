CREATE OR REPLACE FUNCTION public.can_read_vehicle_image(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(_name))[2]
      AND (
        (v.status = 'active' AND v.verification_status = 'approved')
        OR v.vendor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_vehicle_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_vehicle_image(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public read vehicle-images" ON storage.objects;
CREATE POLICY "Read approved vehicle-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-images' AND public.can_read_vehicle_image(name));