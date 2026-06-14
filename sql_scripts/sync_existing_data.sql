-- ============================================================================
-- SCRIPT: Sync Existing Data (Backfill)
-- ============================================================================
-- Purpose: 
-- 1. Sync Device Registry status with open Repair Tickets.
-- 2. Sync Stock Levels with Device Registry counts.
-- ============================================================================

-- PART 1: Sync Device Status from Repair Tickets
-- ============================================================================
-- If a device has an open repair ticket, ensure it is marked as 'In-Repair'
-- and located at the 'Warehouse' / 'Repair Center'.

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update status to 'In-Repair' for devices with active tickets
  WITH active_repairs AS (
    SELECT DISTINCT device_id
    FROM repair_tickets
    WHERE status IN ('Reported', 'Assessing', 'In-Repair', 'Quality-Check', 'Repaired')
  )
  UPDATE device_registry dr
  SET 
    status = 'In-Repair',
    current_holder_type = 'Warehouse',
    current_holder_id = 'Repair Center',
    last_verified_date = NOW()
  FROM active_repairs ar
  WHERE dr.id = ar.device_id
    AND dr.status != 'In-Repair';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % devices to In-Repair based on active tickets.', updated_count;

  -- Update status to 'Decommissioned' for devices with decommissioned tickets
  WITH decommissioned_repairs AS (
    SELECT DISTINCT device_id
    FROM repair_tickets
    WHERE status = 'Decommissioned'
  )
  UPDATE device_registry dr
  SET 
    status = 'Decommissioned',
    last_verified_date = NOW()
  FROM decommissioned_repairs dr_rep
  WHERE dr.id = dr_rep.device_id
    AND dr.status != 'Decommissioned';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % devices to Decommissioned based on tickets.', updated_count;
END $$;


-- PART 2: Sync Stock Levels from Device Registry
-- ============================================================================
-- Recalculate 'Available' stock quantities for the Warehouse based on 
-- the current state of the Device Registry.

DO $$
DECLARE
  dtype TEXT;
  s_id UUID;
  actual_count INTEGER;
  meta RECORD;
  synced_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting Stock Level Sync...';

  -- Iterate through all distinct device types found in the registry
  FOR dtype IN (SELECT DISTINCT device_type FROM device_registry WHERE device_type IS NOT NULL) LOOP
    
    -- 1. Get Representative Metadata for this Device Type
    -- We grab the first non-null values we can find to populate the stock_levels details
    SELECT 
      item_category, 
      item_nature, 
      item_code, 
      item_description 
    INTO meta
    FROM device_registry 
    WHERE device_type = dtype
    LIMIT 1;
    
    -- 2. Count Total 'Available' items in 'Warehouse' for this Device Type
    SELECT COUNT(*) INTO actual_count
    FROM device_registry
    WHERE device_type = dtype
      AND status = 'Available'
      AND (current_holder_type = 'Warehouse' OR current_holder_type IS NULL);
      
    -- 3. Find existing stock_level record for Warehouse
    SELECT id INTO s_id 
    FROM stock_levels 
    WHERE device_type = dtype 
      AND stock_holder = 'Warehouse'
    LIMIT 1;

    -- 4. Upsert (Update or Insert)
    IF s_id IS NOT NULL THEN
      -- Update existing record
      UPDATE stock_levels 
      SET 
        quantity = actual_count,
        -- Try to cast, fallback to null if fails (though trigger logic assumes valid enums)
        item_category = meta.item_category::business_line_enum,
        item_nature = meta.item_nature::item_nature_enum,
        item_code = meta.item_code,
        item_description = meta.item_description,
        updated_at = NOW()
      WHERE id = s_id;
    ELSE
      -- Insert new record (only if we actually have stock or valid metadata)
      IF actual_count > 0 THEN
        INSERT INTO stock_levels (
          device_type, 
          item_category, 
          item_nature, 
          item_code, 
          item_description, 
          quantity, 
          stock_holder, 
          item_status
        ) VALUES (
          dtype, 
          meta.item_category::business_line_enum, 
          meta.item_nature::item_nature_enum, 
          meta.item_code, 
          meta.item_description,
          actual_count, 
          'Warehouse', 
          'Available'
        );
      END IF;
    END IF;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Stock Level Sync Complete. Processed % device types.', synced_count;
END $$;
