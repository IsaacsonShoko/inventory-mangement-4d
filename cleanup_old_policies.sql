-- Remove old/conflicting policies that use {public} role
-- These were created by mistake and conflict with proper authenticated policies

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;

-- Verify only the correct policies remain
SELECT
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
