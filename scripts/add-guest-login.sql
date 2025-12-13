-- Migration: Add Guest Login Support
-- Run this in Supabase SQL Editor

-- 1. Add is_guest column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- 2. Create index for guest users
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_guest
ON user_profiles(is_guest);

-- 3. Add RLS policy to allow guest read access
DROP POLICY IF EXISTS "Guests can read public data" ON user_profiles;

CREATE POLICY "Guests can read public data"
ON user_profiles FOR SELECT
USING (
  is_guest = true
  OR auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Update types to include is_guest in UserProfile
COMMENT ON COLUMN user_profiles.is_guest IS 'Indicates if this is a guest/demo account for portfolio viewing';
