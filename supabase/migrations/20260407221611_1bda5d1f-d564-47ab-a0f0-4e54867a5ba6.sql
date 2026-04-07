-- Add missing columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS video_url text DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'text';

-- Add max_devices to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_devices integer DEFAULT 3;

-- Allow admins to UPDATE any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Allow admins to INSERT profiles (for edge cases)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));