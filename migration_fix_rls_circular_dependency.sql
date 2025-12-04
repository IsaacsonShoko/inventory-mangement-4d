-- Migration: Fix RLS circular dependency causing profile fetch to hang
-- Date: 2025-12-04
-- Issue: Admin policies have circular dependency - selecting from user_profiles
--        to check if user is admin, which requires checking policies on user_profiles

-- Step 1: Create helper function to check admin status
-- SECURITY DEFINER means it runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Check if user is admin - bypasses RLS to prevent circular dependency';

-- Step 2: Drop the problematic policies with circular dependencies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;

-- Step 3: Recreate admin policies using the helper function
-- This avoids circular dependency because is_admin() bypasses RLS

CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Verify the fix
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
