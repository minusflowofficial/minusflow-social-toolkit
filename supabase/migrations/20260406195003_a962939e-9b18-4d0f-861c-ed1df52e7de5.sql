
-- Page views tracking
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  country TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views
CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read page views"
ON public.page_views FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Tool usage logs
CREATE TABLE public.tool_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  tool_slug TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  input_url TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  duration_ms INTEGER DEFAULT 0,
  user_agent TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tool_usage_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert tool logs
CREATE POLICY "Anyone can insert tool logs"
ON public.tool_usage_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read tool logs"
ON public.tool_usage_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Feature flags
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags
CREATE POLICY "Public can read feature flags"
ON public.feature_flags FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Seed feature flags
INSERT INTO public.feature_flags (name, enabled, description) VALUES
('bulk_download', true, 'Allow bulk URL downloading across all tools'),
('playlist_download', true, 'YouTube playlist download feature'),
('transcript_tool', true, 'YouTube transcript extraction tool'),
('thumbnail_downloader', true, 'YouTube thumbnail downloader'),
('tiktok_downloader', true, 'TikTok video downloader'),
('instagram_downloader', true, 'Instagram reel/post downloader');

-- Enable realtime for live visitors
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
