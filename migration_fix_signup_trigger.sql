-- Migration: Fix handle_new_user trigger to match current schema
-- Date: 2025-12-03
-- Issue: Trigger was casting to user_role_enum but column is TEXT

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

  -- Extract metadata fields from signup form
  extracted_first_name := NEW.raw_user_meta_data->>'first_name';
  extracted_last_name := NEW.raw_user_meta_data->>'last_name';
  extracted_company := NEW.raw_user_meta_data->>'company';

  -- Build full_name from first + last
  IF extracted_first_name IS NOT NULL AND extracted_last_name IS NOT NULL THEN
    extracted_full_name := extracted_first_name || ' ' || extracted_last_name;
  ELSE
    extracted_full_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Insert user profile (fixed: removed ::user_role_enum cast)
  INSERT INTO public.user_profiles (
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
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END,
    CASE WHEN is_admin THEN 'approved'::approval_status_enum ELSE 'pending'::approval_status_enum END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger should already exist, but recreate if needed:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
