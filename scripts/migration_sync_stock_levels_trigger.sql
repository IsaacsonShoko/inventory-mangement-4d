-- ============================================================================
-- MIGRATION: Auto-Sync Device Registry to Stock Levels
-- ============================================================================
-- This script creates a trigger to automatically update stock_levels
-- whenever the device_registry table changes (Insert, Update, Delete).
-- This removes the need for fragile application-side synchronization.

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION sync_stock_levels_from_registry()
RETURNS TRIGGER AS $$
DECLARE
  target_device_type TEXT;
  target_item_category TEXT;
  target_item_nature TEXT;
  target_item_code TEXT;
  target_item_description TEXT;
  current_count INTEGER;
  stock_level_id UUID;
BEGIN
  -- Determine which device type to update
  -- If DELETE, use OLD record. If INSERT/UPDATE, use NEW record.
  IF (TG_OP = 'DELETE') THEN
    target_device_type := OLD.device_type;
    target_item_category := OLD.item_category;
    target_item_nature := OLD.item_nature;
    target_item_code := OLD.item_code;
    target_item_description := OLD.item_description;
  ELSE
    target_device_type := NEW.device_type;
    target_item_category := NEW.item_category;
    target_item_nature := NEW.item_nature;
    target_item_code := NEW.item_code;
    target_item_description := NEW.item_description;
  END IF;

  -- Calculate the exact count of 'Available' devices of this type held by 'Warehouse'
  SELECT COUNT(*) INTO current_count
  FROM device_registry
  WHERE device_type = target_device_type
    AND status = 'Available'
    AND (current_holder_type = 'Warehouse' OR current_holder_type IS NULL);

  -- Check if a stock_level record exists for this device type
  SELECT id INTO stock_level_id
  FROM stock_levels
  WHERE device_type = target_device_type
    AND stock_holder = 'Warehouse'
  LIMIT 1;

  IF stock_level_id IS NOT NULL THEN
    -- Update existing record
    UPDATE stock_levels
    SET 
      quantity = current_count,
      updated_at = NOW()
    WHERE id = stock_level_id;
  ELSE
    -- Insert new record if count > 0 (don't create records for 0 items if they don't exist)
    IF current_count > 0 THEN
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
        target_device_type,
        target_item_category::business_line_enum,
        target_item_nature::item_nature_enum,
        target_item_code,
        target_item_description,
        current_count,
        'Warehouse',
        'Available'
      );
    END IF;
  END IF;

  RETURN NULL; -- Trigger result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_stock_levels ON device_registry;

CREATE TRIGGER trigger_sync_stock_levels
AFTER INSERT OR UPDATE OR DELETE ON device_registry
FOR EACH ROW
EXECUTE FUNCTION sync_stock_levels_from_registry();

-- 3. Initial Sync (Optional but recommended to fix current state)
-- We will run a quick block to sync all existing types
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT DISTINCT device_type FROM device_registry) LOOP
    -- Fake an update to trigger the sync logic (or just call logic directly, but this is cleaner)
    -- Actually, we can't invoke the trigger easily. Let's just run the logic once.
    
    DECLARE
      actual_count INTEGER;
      s_id UUID;
      d_info RECORD;
    BEGIN
      -- Get info from one random device of this type
      SELECT item_category, item_nature, item_code, item_description 
      INTO d_info
      FROM device_registry 
      WHERE device_type = r.device_type 
      LIMIT 1;

      -- Count available
      SELECT COUNT(*) INTO actual_count
      FROM device_registry
      WHERE device_type = r.device_type
        AND status = 'Available'
        AND (current_holder_type = 'Warehouse' OR current_holder_type IS NULL);

      -- Upsert stock_levels
      SELECT id INTO s_id FROM stock_levels WHERE device_type = r.device_type AND stock_holder = 'Warehouse';
      
      IF s_id IS NOT NULL THEN
        UPDATE stock_levels 
        SET quantity = actual_count
        WHERE id = s_id;
      ELSE
        IF actual_count > 0 THEN
          INSERT INTO stock_levels (
            device_type, item_category, item_nature, item_code, item_description, 
            quantity, stock_holder, item_status
          ) VALUES (
            r.device_type, d_info.item_category::business_line_enum, d_info.item_nature::item_nature_enum, d_info.item_code, d_info.item_description,
            actual_count, 'Warehouse', 'Available'
          );
        END IF;
      END IF;
    END;
  END LOOP;
END $$;
