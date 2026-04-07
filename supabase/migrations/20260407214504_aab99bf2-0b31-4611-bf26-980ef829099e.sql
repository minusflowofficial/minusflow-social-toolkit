
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text DEFAULT '';

-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload banners
CREATE POLICY "Users can upload banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Users can update own banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view banners" ON storage.objects FOR SELECT TO public USING (bucket_id = 'banners');
