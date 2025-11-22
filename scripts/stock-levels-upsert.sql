-- Add unique constraint to stock_levels for upsert from stock counts
-- Run this in Supabase SQL Editor

-- Stock levels should be unique per device_type + tech_id (or location)
-- When a user submits a count, it updates the corresponding stock level

-- Add unique constraint for upsert
-- This identifies a unique inventory item by device type and technician
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique_item
ON stock_levels(device_type, tech_id)
WHERE tech_id IS NOT NULL;

-- For warehouse stock (no tech_id), use device_type + bin_location
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique_warehouse
ON stock_levels(device_type, bin_location)
WHERE tech_id IS NULL AND bin_location IS NOT NULL;
