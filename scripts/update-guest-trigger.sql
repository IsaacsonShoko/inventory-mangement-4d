-- Migration: Update handle_new_user to auto-approve guest user
-- Date: 2025-12-15
-- Description: Ensures the guest account is automatically approved and flagged as a guest
--              exactly like admin accounts are auto-approved.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'carolinem@xlink.co.za',
    'yakooba@xlink.co.za',
    'briana@xlink.co.za',
    'isaacson.shoko@4danalytics.co.za'
  ];
  guest_email TEXT := 'guest@4d-analytics-demo.local';
  
  is_admin BOOLEAN;
  is_guest_user BOOLEAN;
  
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  extracted_full_name TEXT;
  extracted_company TEXT;
  
  final_role user_role_enum;
  final_status approval_status_enum;
BEGIN
  -- Check user type based on email
  is_admin := NEW.email = ANY(admin_emails);
  is_guest_user := NEW.email = guest_email;

  -- Extract metadata fields
  extracted_first_name := NEW.raw_user_meta_data->>'first_name';
  extracted_last_name := NEW.raw_user_meta_data->>'last_name';
  extracted_company := NEW.raw_user_meta_data->>'company';

  -- Build full_name
  IF extracted_first_name IS NOT NULL AND extracted_last_name IS NOT NULL THEN
    extracted_full_name := extracted_first_name || ' ' || extracted_last_name;
  ELSE
    extracted_full_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Determine Role
  IF is_admin THEN
    final_role := 'admin'::user_role_enum;
  ELSE
    final_role := 'user'::user_role_enum;
  END IF;

  -- Determine Approval Status
  IF is_admin OR is_guest_user THEN
    final_status := 'approved'::approval_status_enum;
  ELSE
    final_status := 'pending'::approval_status_enum;
  END IF;

  -- Insert or Update profile
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    company,
    role,
    approval_status,
    is_guest
  )
  VALUES (
    NEW.id,
    NEW.email,
    extracted_full_name,
    extracted_first_name,
    extracted_last_name,
    extracted_company,
    final_role,
    final_status,
    is_guest_user
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    approval_status = EXCLUDED.approval_status,
    is_guest = EXCLUDED.is_guest,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    company = COALESCE(EXCLUDED.company, user_profiles.company);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
