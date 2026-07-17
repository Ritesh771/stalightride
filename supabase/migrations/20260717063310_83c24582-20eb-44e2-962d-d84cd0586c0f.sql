
-- Public read for vehicle-images & avatars
CREATE POLICY "Public read vehicle-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users upload into their own folder
CREATE POLICY "User uploads vehicle-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User updates vehicle-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User deletes vehicle-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User uploads avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User updates avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User uploads kyc" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User reads own kyc" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
