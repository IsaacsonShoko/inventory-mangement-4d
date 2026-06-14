-- Migration: Add first_name, last_name, company to user_profiles
-- Date: 2025-12-02
-- Description: Extends user_profiles table to support enhanced signup form

-- ============================================
-- 1. ADD NEW COLUMNS
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;

-- ============================================
-- 2. UPDATE TRIGGER TO EXTRACT NEW FIELDS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'carolinem@xlink.co.za',
    'yakooba@xlink.co.za',
    'briana@xlink.co.za',
    'isaacson.shoko@4danalytics.co.za'
  ];
  is_admin BOOLEAN;
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  extracted_full_name TEXT;
  extracted_company TEXT;
BEGIN
  -- Check if user email is in admin list
  is_admin := NEW.email = ANY(admin_emails);

  -- Extract metadata fields (new signup form sends first_name, last_name, company, role)
  extracted_first_name := NEW.raw_user_meta_data->>'first_name';
  extracted_last_name := NEW.raw_user_meta_data->>'last_name';
  extracted_company := NEW.raw_user_meta_data->>'company';

  -- Build full_name from first + last if available, otherwise use legacy full_name field
  IF extracted_first_name IS NOT NULL AND extracted_last_name IS NOT NULL THEN
    extracted_full_name := extracted_first_name || ' ' || extracted_last_name;
  ELSE
    extracted_full_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    company,
    role,
    approval_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    extracted_full_name,
    extracted_first_name,
    extracted_last_name,
    extracted_company,
    CASE WHEN is_admin THEN 'admin'::user_role_enum ELSE 'user'::user_role_enum END,
    CASE WHEN is_admin THEN 'approved'::approval_status_enum ELSE 'pending'::approval_status_enum END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. OPTIONAL: MIGRATE EXISTING full_name DATA
-- ============================================

-- This attempts to split existing full_name values into first_name and last_name
-- Only updates rows where first_name and last_name are NULL

UPDATE user_profiles
SET
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL
  AND last_name IS NULL
  AND full_name IS NOT NULL;

-- ============================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_first_name ON user_profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_name ON user_profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company);

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN user_profiles.first_name IS 'User first name from enhanced signup form';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name from enhanced signup form';
COMMENT ON COLUMN user_profiles.company IS 'User company/organization from signup form';

-- Migration complete!
-- New signups will now capture: first_name, last_name, company
-- Existing users have been migrated (full_name split into first/last)
