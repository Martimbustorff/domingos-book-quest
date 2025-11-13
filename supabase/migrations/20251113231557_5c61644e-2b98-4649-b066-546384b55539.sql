-- Fix critical security issues: Require authentication for data modifications

-- 1. Update events table policies
DROP POLICY IF EXISTS "Events can be inserted by anyone" ON events;

CREATE POLICY "Authenticated users can insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Update popular_books table policies
DROP POLICY IF EXISTS "Anyone can add books to popular list" ON popular_books;

CREATE POLICY "Authenticated users can add books to popular list"
ON popular_books FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for profile timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add user_id to events table for tracking
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);