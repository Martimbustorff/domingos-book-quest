-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'teacher', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create guardian_relationships table
CREATE TABLE public.guardian_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_id uuid NOT NULL,
    student_id uuid NOT NULL,
    relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'teacher')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    invitation_code text UNIQUE,
    created_at timestamptz DEFAULT now(),
    approved_at timestamptz,
    UNIQUE (guardian_id, student_id)
);

-- Enable RLS on guardian_relationships
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for guardian_relationships
CREATE POLICY "Guardians can view their relationships"
  ON public.guardian_relationships FOR SELECT
  USING (auth.uid() = guardian_id OR auth.uid() = student_id);

CREATE POLICY "Guardians can create relationships"
  ON public.guardian_relationships FOR INSERT
  WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Students can approve relationships"
  ON public.guardian_relationships FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Create security definer function to check if user is guardian of student
CREATE OR REPLACE FUNCTION public.is_guardian_of(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardian_relationships
    WHERE student_id = _student_id 
      AND guardian_id = auth.uid()
      AND status = 'approved'
  );
$$;

-- Update quiz_history RLS policies to allow guardian access
DROP POLICY IF EXISTS "Users can view their own quiz history" ON public.quiz_history;
CREATE POLICY "Users and guardians can view quiz history"
  ON public.quiz_history FOR SELECT
  USING (auth.uid() = user_id OR public.is_guardian_of(user_id));

-- Update user_stats RLS policies to allow guardian access
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users and guardians can view stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id OR public.is_guardian_of(user_id));

-- Update user_achievements RLS policies to allow guardian access
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users and guardians can view achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id OR public.is_guardian_of(user_id));

-- Assign 'student' role to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;