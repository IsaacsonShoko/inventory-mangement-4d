-- Migration: Fix Supabase Security Linter Issues
-- Date: 2026-03-25
-- Fixes:
--   1. 9 SECURITY DEFINER views → SECURITY INVOKER
--   2. 3 tables without RLS → Enable RLS + add policies
--
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- PART 1: Convert SECURITY DEFINER views to SECURITY INVOKER
-- ============================================================
-- These views currently bypass the querying user's RLS policies.
-- Switching to SECURITY INVOKER makes them respect the caller's permissions.
-- None of these views are queried from client code, so this is safe.

ALTER VIEW public.sla_performance_summary SET (security_invoker = on);
ALTER VIEW public.sla_at_risk_orders SET (security_invoker = on);
ALTER VIEW public.repair_queue SET (security_invoker = on);
ALTER VIEW public.partial_picks_pending SET (security_invoker = on);
ALTER VIEW public.orders_ready_dispatch SET (security_invoker = on);
ALTER VIEW public.orders_pending_pick SET (security_invoker = on);
ALTER VIEW public.backorder_queue SET (security_invoker = on);
ALTER VIEW public.available_stock SET (security_invoker = on);
ALTER VIEW public.device_summary SET (security_invoker = on);


-- ============================================================
-- PART 2: Enable RLS on inventory_items
-- ============================================================
-- Read: all authenticated users (used in order forms, stock counts, stock admin)
-- Write: admin and back_office only (StockAdmin page)

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "inventory_items_select_authenticated"
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin and back_office to insert
CREATE POLICY "inventory_items_insert_admin_backoffice"
  ON public.inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Allow admin and back_office to update
CREATE POLICY "inventory_items_update_admin_backoffice"
  ON public.inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Allow admin to delete (defensive — no client DELETE exists today)
CREATE POLICY "inventory_items_delete_admin"
  ON public.inventory_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );


-- ============================================================
-- PART 3: Enable RLS on point_of_presence
-- ============================================================
-- Read: all authenticated users (cascading dropdowns, technician directory)
-- Write: admin and back_office only (PointOfPresence page)

ALTER TABLE public.point_of_presence ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "point_of_presence_select_authenticated"
  ON public.point_of_presence
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin and back_office to insert
CREATE POLICY "point_of_presence_insert_admin_backoffice"
  ON public.point_of_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Allow admin and back_office to update
CREATE POLICY "point_of_presence_update_admin_backoffice"
  ON public.point_of_presence
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Allow admin and back_office to delete
CREATE POLICY "point_of_presence_delete_admin_backoffice"
  ON public.point_of_presence
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'back_office')
    )
  );


-- ============================================================
-- PART 4: Enable RLS on documents
-- ============================================================
-- This table is only accessed via the service role key (chat.js + ingest script).
-- Service role bypasses RLS, so these policies are a safety net.
-- We allow authenticated users to SELECT (in case of future direct queries)
-- but block all writes from non-service-role clients.

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (safety net — actual reads use service role)
CREATE POLICY "documents_select_authenticated"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only the service role (which bypasses RLS) can write to this table.
-- This prevents any browser client from modifying the RAG knowledge base.
