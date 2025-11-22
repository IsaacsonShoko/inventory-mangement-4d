-- Add user_email column to stock_counts for traceability
-- Run this in Supabase SQL Editor

-- Add user_email column
ALTER TABLE stock_counts ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add count_period to track which period this count belongs to (e.g., '2024-01' for monthly)
ALTER TABLE stock_counts ADD COLUMN IF NOT EXISTS count_period TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_counts_user_email ON stock_counts(user_email);
CREATE INDEX IF NOT EXISTS idx_stock_counts_period ON stock_counts(count_period);

-- Create unique constraint for upsert logic
-- This allows only one count per user + device + count_type + period
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_counts_unique_entry
ON stock_counts(user_email, device_type, count_type, count_period)
WHERE user_email IS NOT NULL AND count_period IS NOT NULL;

-- Update RLS policies to allow users to see their own counts
DROP POLICY IF EXISTS "Allow authenticated read on stock_counts" ON stock_counts;

-- Admins can see all counts
CREATE POLICY "Admins can read all stock_counts"
  ON stock_counts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can only insert their own counts
DROP POLICY IF EXISTS "Allow authenticated insert on stock_counts" ON stock_counts;
CREATE POLICY "Users can insert own stock_counts"
  ON stock_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can only update their own counts
DROP POLICY IF EXISTS "Allow authenticated update on stock_counts" ON stock_counts;
CREATE POLICY "Users can update own stock_counts"
  ON stock_counts
  FOR UPDATE
  TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can only delete their own counts
DROP POLICY IF EXISTS "Allow authenticated delete on stock_counts" ON stock_counts;
CREATE POLICY "Users can delete own stock_counts"
  ON stock_counts
  FOR DELETE
  TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
