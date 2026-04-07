-- Session tracking table for multi-device blocking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  device_info text DEFAULT '',
  ip_address text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(user_id, is_active);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions" ON public.user_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sessions" ON public.user_sessions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Add suspended field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT '';