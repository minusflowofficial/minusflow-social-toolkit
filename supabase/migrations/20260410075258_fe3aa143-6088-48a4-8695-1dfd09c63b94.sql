-- Allow admins to upload avatars for any user
CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.is_admin(auth.uid()));

-- Allow admins to update avatars for any user
CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.is_admin(auth.uid()));

-- Allow admins to delete avatars for any user
CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.is_admin(auth.uid()));

-- Allow admins to upload banners for any user
CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'banners' AND public.is_admin(auth.uid()));

-- Allow admins to update banners for any user
CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'banners' AND public.is_admin(auth.uid()));

-- Allow admins to delete banners for any user
CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'banners' AND public.is_admin(auth.uid()));