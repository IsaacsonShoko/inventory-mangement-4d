-- Fix RLS Policies for unique_orders and stock_order tables
-- Issue: Users getting "new row violates row-level security policy"
-- Run this in Supabase SQL Editor

-- ============================================
-- UNIQUE_ORDERS RLS POLICIES
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE unique_orders ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to SELECT (read) orders
CREATE POLICY "Allow authenticated users to read unique_orders"
  ON unique_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow authenticated users to INSERT (create) orders
CREATE POLICY "Allow authenticated users to create unique_orders"
  ON unique_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE approval_status = 'approved'
    )
  );

-- 3. Allow users to UPDATE orders (admins and back_office can update any, users can update their own)
CREATE POLICY "Allow users to update unique_orders"
  ON unique_orders
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins and back_office can update any order
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
    -- OR users can update orders they created (if ordered_by matches their email)
    OR ordered_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same as USING clause
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
    OR ordered_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 4. Allow admins/back_office to DELETE orders
CREATE POLICY "Allow admins to delete unique_orders"
  ON unique_orders
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
  );

-- ============================================
-- STOCK_ORDER RLS POLICIES
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE stock_order ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to SELECT (read) stock orders
CREATE POLICY "Allow authenticated users to read stock_order"
  ON stock_order
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow authenticated users to INSERT (create) stock order line items
CREATE POLICY "Allow authenticated users to create stock_order"
  ON stock_order
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE approval_status = 'approved'
    )
  );

-- 3. Allow users to UPDATE stock orders
CREATE POLICY "Allow users to update stock_order"
  ON stock_order
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins and back_office can update any line item
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
    -- OR users can update line items for their own orders
    OR ordered_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same as USING clause
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
    OR ordered_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 4. Allow admins/back_office to DELETE stock orders
CREATE POLICY "Allow admins to delete stock_order"
  ON stock_order
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles
      WHERE role IN ('admin', 'back_office')
        AND approval_status = 'approved'
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Check policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('unique_orders', 'stock_order')
ORDER BY tablename, policyname;
