-- ============================================================================
-- MIGRATION: Process Stock Count Submission (Write-Back Logic)
-- ============================================================================
-- This function implements the logic to:
-- 1. Insert the stock count record (history).
-- 2. Look up the device in device_registry by Serial Number.
-- 3. Update the device's status and condition (Write-Back).
-- 4. Enrich metadata if the registry is missing info but the count provided it.
-- ============================================================================

CREATE OR REPLACE FUNCTION process_stock_count_submission(
  p_count_type text,
  p_stock_holder text,
  p_region text,
  p_count_date timestamptz,
  p_device_type text,
  p_quantity integer,
  p_manufacture_serial_number text,
  p_qr_code_serial_number text,
  p_xlink_serial_number text,
  p_cradle_serial_number text,
  p_charger_serial_number text,
  p_item_status text,
  p_fault_reason text,
  p_overall_condition text,
  p_counted_by text,
  p_business_line text,
  p_item_nature text,
  p_item_code text,
  p_item_description text
)
RETURNS uuid AS $$
DECLARE
  v_stock_count_id uuid;
  v_device_id uuid;
  v_existing_metadata record;
  v_serial_to_lookup text;
  v_new_status device_status_enum;
BEGIN
  -- 1. Determine which serial number to use for lookup
  -- Priority: Manufacture > QR Code > Xlink
  IF p_manufacture_serial_number IS NOT NULL AND p_manufacture_serial_number != '' THEN
    v_serial_to_lookup := p_manufacture_serial_number;
  ELSIF p_qr_code_serial_number IS NOT NULL AND p_qr_code_serial_number != '' THEN
    v_serial_to_lookup := p_qr_code_serial_number;
  ELSIF p_xlink_serial_number IS NOT NULL AND p_xlink_serial_number != '' THEN
    v_serial_to_lookup := p_xlink_serial_number;
  END IF;

  -- 2. Insert into stock_counts (Historical Log)
  INSERT INTO stock_counts (
    count_type,
    stock_holder,
    region,
    count_date,
    device_type,
    quantity,
    manufacture_serial_number,
    qr_code_serial_number,
    xlink_serial_number,
    cradle_serial_number,
    charger_serial_number,
    item_status,
    fault_reason,
    overall_condition,
    counted_by,
    business_line,
    item_nature,
    item_code,
    item_description
  ) VALUES (
    p_count_type::count_type,
    p_stock_holder,
    p_region,
    p_count_date,
    p_device_type,
    p_quantity,
    p_manufacture_serial_number,
    p_qr_code_serial_number,
    p_xlink_serial_number,
    p_cradle_serial_number,
    p_charger_serial_number,
    p_item_status,
    p_fault_reason,
    p_overall_condition,
    p_counted_by,
    p_business_line,
    p_item_nature::item_nature_enum,
    p_item_code,
    p_item_description
  ) RETURNING id INTO v_stock_count_id;

  -- 3. If we have a serial number, attempt to find and update the device
  IF v_serial_to_lookup IS NOT NULL THEN
    
    -- Find device by any matching serial column
    SELECT id, item_category, item_nature, item_code, item_description, status 
    INTO v_existing_metadata
    FROM device_registry
    WHERE serial_number = v_serial_to_lookup
       OR qr_code_serial_number = v_serial_to_lookup
       OR xlink_serial_number = v_serial_to_lookup
    LIMIT 1;

    IF FOUND THEN
      v_device_id := v_existing_metadata.id;

      -- Determine new status based on count input
      -- If count says 'Faulty', update registry to 'Faulty'
      -- If count says 'Functional', update registry to 'Available' (if it was Faulty/Missing)
      IF p_item_status = 'Faulty' THEN
        v_new_status := 'Faulty';
      ELSIF p_item_status = 'Functional' THEN
        -- Only change status back to Available if it was previously in a "bad" state
        -- Don't overwrite 'Installed' or 'In-Repair' just because it was counted as functional
        IF v_existing_metadata.status IN ('Faulty', 'Missing', 'Unverified') THEN
          v_new_status := 'Available';
        ELSE
          v_new_status := v_existing_metadata.status; -- Keep existing
        END IF;
      ELSE
        v_new_status := v_existing_metadata.status;
      END IF;

      -- Update the Device Registry (Write-Back)
      UPDATE device_registry
      SET
        -- Update Status & Condition
        status = v_new_status,
        overall_condition = p_overall_condition,
        last_verified_date = NOW(),
        
        -- Enrich Metadata (only if missing in registry but provided in count)
        item_category = COALESCE(NULLIF(item_category, ''), NULLIF(p_business_line, ''), item_category),
        item_nature = COALESCE(NULLIF(item_nature, ''), NULLIF(p_item_nature, ''), item_nature),
        item_code = COALESCE(NULLIF(item_code, ''), NULLIF(p_item_code, ''), item_code),
        item_description = COALESCE(NULLIF(item_description, ''), NULLIF(p_item_description, ''), item_description),
        
        -- Update secondary serials if provided
        cradle_serial_number = COALESCE(NULLIF(p_cradle_serial_number, ''), cradle_serial_number),
        charger_serial_number = COALESCE(NULLIF(p_charger_serial_number, ''), charger_serial_number),
        xlink_serial_number = COALESCE(NULLIF(p_xlink_serial_number, ''), xlink_serial_number),
        qr_code_serial_number = COALESCE(NULLIF(p_qr_code_serial_number, ''), qr_code_serial_number)
      WHERE id = v_device_id;
      
      -- Note: The 'trigger_sync_stock_levels' on device_registry will now fire automatically
      -- and update the stock_levels table based on these changes.
    END IF;
  END IF;

  RETURN v_stock_count_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_stock_count_submission TO authenticated;
GRANT EXECUTE ON FUNCTION process_stock_count_submission TO service_role;
