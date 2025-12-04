-- Migration: Separate job title from system role
-- Date: 2025-12-03
-- Issue: Signup form collects job title but stores in system role field

-- Add job_title column to store user's job function
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Update trigger to separate job title from system role
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
  extracted_job_title TEXT;
BEGIN
  is_admin := NEW.email = ANY(admin_emails);

  -- Extract metadata from signup form
  extracted_first_name := NEW.raw_user_meta_data->>'first_name';
  extracted_last_name := NEW.raw_user_meta_data->>'last_name';
  extracted_company := NEW.raw_user_meta_data->>'company';
  extracted_job_title := NEW.raw_user_meta_data->>'role';  -- User's job selection

  -- Build full_name
  IF extracted_first_name IS NOT NULL AND extracted_last_name IS NOT NULL THEN
    extracted_full_name := extracted_first_name || ' ' || extracted_last_name;
  ELSE
    extracted_full_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Insert profile
  -- role: system access level (default 'user', admins can change later)
  -- job_title: user's actual job function from signup form
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    company,
    job_title,
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
    extracted_job_title,  -- Store job title from signup form
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END,  -- System role defaults to 'user'
    CASE WHEN is_admin THEN 'approved'::approval_status_enum ELSE 'pending'::approval_status_enum END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for job_title searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_job_title ON public.user_profiles(job_title);

-- Add comment
COMMENT ON COLUMN public.user_profiles.job_title IS 'User job function from signup (Technician, Manager, etc.)';
COMMENT ON COLUMN public.user_profiles.role IS 'System access level (admin, back_office, user) - assigned by admins';
