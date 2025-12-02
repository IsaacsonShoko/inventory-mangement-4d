-- Migration: Add user_email and count_period to stock tracking tables
-- Purpose: Track who performed stock counts and the period they're for
-- Date: 2025-12-02

-- Add user_email column to stock_levels
-- Tracks which user performed this stock count entry
ALTER TABLE stock_levels
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add count_period column to stock_levels
-- Stores the specific period identifier (e.g., "2025-12", "January 2025")
-- Different from count_type which is the frequency (Monthly/Mid-Month/Daily)
ALTER TABLE stock_levels
ADD COLUMN IF NOT EXISTS count_period TEXT;

-- Add user_email column to stock_counts
-- Tracks which user performed this stock count entry
ALTER TABLE stock_counts
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add count_period column to stock_counts
-- Stores the specific period identifier
ALTER TABLE stock_counts
ADD COLUMN IF NOT EXISTS count_period TEXT;

-- Create indexes for filtering by user and period
CREATE INDEX IF NOT EXISTS idx_stock_levels_user_email
  ON stock_levels(user_email);

CREATE INDEX IF NOT EXISTS idx_stock_levels_count_period
  ON stock_levels(count_period);

CREATE INDEX IF NOT EXISTS idx_stock_counts_user_email
  ON stock_counts(user_email);

CREATE INDEX IF NOT EXISTS idx_stock_counts_count_period
  ON stock_counts(count_period);

-- Note: The upsert conflict in stockCountSupabaseService.ts uses:
-- onConflict: 'user_email,device_type,count_type,count_period'
-- This creates a unique constraint per user, per device, per count type, per period
