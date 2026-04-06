
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- RLS for user_roles: only admins can read
CREATE POLICY "Admins can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only super_admins can manage roles
CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tools table
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  route TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Wrench',
  group_name TEXT DEFAULT 'Downloaders',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disabled')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible+enabled tools
CREATE POLICY "Public can view active tools"
ON public.tools FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can modify tools
CREATE POLICY "Admins can manage tools"
ON public.tools FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Site settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Seed default tools
INSERT INTO public.tools (name, slug, route, description, icon, group_name, sort_order) VALUES
('YouTube Downloader', 'youtube-downloader', '/', 'Download YouTube videos in any format', 'Youtube', 'Downloaders', 1),
('TikTok Downloader', 'tiktok-downloader', '/tiktok', 'Download TikTok videos without watermark', 'Music', 'Downloaders', 2),
('Instagram Downloader', 'instagram-downloader', '/instagram', 'Download Instagram reels and posts', 'Instagram', 'Downloaders', 3),
('YouTube Transcript', 'youtube-transcript', '/transcript', 'Extract YouTube video transcripts', 'FileText', 'Transcripts', 4),
('Thumbnail Downloader', 'thumbnail-downloader', '/thumbnail', 'Download YouTube thumbnails in all sizes', 'Image', 'Downloaders', 5);

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
('maintenance_mode', '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon.", "admin_bypass": true}'),
('site_status', '{"enabled": true}'),
('branding', '{"site_name": "YTFetch", "logo_url": "", "theme": "dark"}');
