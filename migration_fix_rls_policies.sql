-- Migration: Fix RLS policies for user_profiles
-- Date: 2025-12-04
-- Issue: Users cannot read their own profile, causing auth to hang

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.user_profiles;

-- Policy 1: Users can read their own profile
-- This is CRITICAL for auth to work - users must be able to fetch their profile
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Admins can read all profiles
-- Needed for user management pages
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 3: Users can update their own profile
-- Allows users to update their own info
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can update any profile
-- Needed for user management (approval, role changes)
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 5: Service role can insert profiles
-- The handle_new_user trigger uses SECURITY DEFINER, so it runs with elevated privileges
-- But we need to allow the service to insert
CREATE POLICY "Service role can insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify policies were created
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
