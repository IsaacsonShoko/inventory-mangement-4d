-- ============================================
-- ASSET MANAGEMENT - PHASE 1 & 2
-- Device Registry, Stock Ingestion, Repairs
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Device lifecycle status
CREATE TYPE device_status_enum AS ENUM (
  'Available',
  'Installed',
  'Faulty',
  'In-Repair',
  'Decommissioned',
  'Unverified',
  'Missing'
);

-- Who holds the device
CREATE TYPE holder_type_enum AS ENUM (
  'Warehouse',
  'Technician',
  'Vendor'
);

-- Types of device movements
CREATE TYPE movement_type_enum AS ENUM (
  'Ingestion',
  'Dispatch',
  'Installation',
  'Removal',
  'Repair-In',
  'Repair-Out',
  'Transfer',
  'Return',
  'Decommission'
);

-- Fault categories
CREATE TYPE fault_category_enum AS ENUM (
  'Dead On Arrival',
  'Screen Damaged',
  'Cradle/Charger Damaged',
  'Enclosure Damaged',
  'Port/Connector Damaged',
  'Battery Failure',
  'Printer Malfunction',
  'Card Reader Failure',
  'Keypad Malfunction',
  'Speaker/Mic Failure',
  'Software Error',
  'Connectivity Issues',
  'Firmware Corruption',
  'SIM/Network Failure',
  'Water Damage',
  'Heat Damage',
  'Theft/Tampering',
  'Unknown',
  'Other'
);

-- Repair ticket status
CREATE TYPE repair_status_enum AS ENUM (
  'Reported',
  'Assessing',
  'In-Repair',
  'Repaired',
  'Quality-Check',
  'Returned',
  'Decommissioned'
);

-- ============================================
-- TABLES
-- ============================================

-- 1. DEVICE REGISTRY (Master Device Record)
CREATE TABLE device_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE NOT NULL,

  -- Device Info
  device_type TEXT NOT NULL,
  item_category TEXT NOT NULL,
  item_nature TEXT NOT NULL DEFAULT 'Serialised',
  item_code TEXT,
  item_description TEXT,

  -- Current State
  status device_status_enum NOT NULL DEFAULT 'Available',
  current_holder_type holder_type_enum,
  current_holder_id TEXT,

  -- Additional Serials (for devices with multiple components)
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  qr_code_serial_number TEXT,

  -- Lifecycle Info
  date_acquired DATE,
  warranty_expiry DATE,
  last_verified_date TIMESTAMP,
  last_maintenance_date TIMESTAMP,

  -- Source
  supplier TEXT,
  purchase_order_number TEXT,
  ingestion_batch_id UUID,

  -- Condition
  overall_condition TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Indexes for device_registry
CREATE INDEX idx_device_registry_serial ON device_registry(serial_number);
CREATE INDEX idx_device_registry_status ON device_registry(status);
CREATE INDEX idx_device_registry_holder ON device_registry(current_holder_type, current_holder_id);
CREATE INDEX idx_device_registry_device_type ON device_registry(device_type);
CREATE INDEX idx_device_registry_category ON device_registry(item_category);
CREATE INDEX idx_device_registry_created_at ON device_registry(created_at);

-- 2. REPAIR TICKETS (Fault & Repair Workflow)
CREATE TABLE repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  device_id UUID NOT NULL REFERENCES device_registry(id),

  -- Fault Reporting
  reported_by TEXT NOT NULL,
  reported_date TIMESTAMP NOT NULL DEFAULT NOW(),
  fault_category fault_category_enum NOT NULL,
  fault_description TEXT,
  fault_severity TEXT,
  fault_images TEXT[], -- Array of image URLs

  -- Assessment
  assessed_by TEXT,
  assessment_date TIMESTAMP,
  assessment_notes TEXT,
  is_repairable BOOLEAN,
  estimated_repair_hours NUMERIC,

  -- Repair
  repaired_by TEXT,
  repair_start_date TIMESTAMP,
  repair_end_date TIMESTAMP,
  repair_actions TEXT,
  parts_used TEXT,
  repair_cost NUMERIC,

  -- Quality Check
  quality_checked_by TEXT,
  quality_check_date TIMESTAMP,
  quality_check_passed BOOLEAN,
  quality_check_notes TEXT,

  -- Status
  status repair_status_enum NOT NULL DEFAULT 'Reported',

  -- Return to Circulation
  returned_to_stock_date TIMESTAMP,
  returned_to_warehouse TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for repair_tickets
CREATE INDEX idx_repair_tickets_device ON repair_tickets(device_id);
CREATE INDEX idx_repair_tickets_status ON repair_tickets(status);
CREATE INDEX idx_repair_tickets_reported_by ON repair_tickets(reported_by);
CREATE INDEX idx_repair_tickets_fault_category ON repair_tickets(fault_category);
CREATE INDEX idx_repair_tickets_created_at ON repair_tickets(created_at);

-- 3. DEVICE MOVEMENTS (Audit Trail)
CREATE TABLE device_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES device_registry(id),

  -- Movement Details
  movement_type movement_type_enum NOT NULL,
  movement_date TIMESTAMP NOT NULL DEFAULT NOW(),

  -- From/To
  from_holder_type holder_type_enum,
  from_holder_id TEXT,
  to_holder_type holder_type_enum,
  to_holder_id TEXT,

  -- Context
  performed_by TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for device_movements
CREATE INDEX idx_device_movements_device ON device_movements(device_id);
CREATE INDEX idx_device_movements_type ON device_movements(movement_type);
CREATE INDEX idx_device_movements_date ON device_movements(movement_date);
CREATE INDEX idx_device_movements_performed_by ON device_movements(performed_by);

-- 4. INGESTION BATCHES (Stock Ingestion History)
CREATE TABLE ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number SERIAL,

  -- Batch Info
  receiving_warehouse TEXT NOT NULL,
  supplier TEXT,
  date_received DATE NOT NULL,
  purchase_order_number TEXT,
  notes TEXT,

  -- Summary
  total_devices INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Audit
  ingested_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ingestion_batches
CREATE INDEX idx_ingestion_batches_warehouse ON ingestion_batches(receiving_warehouse);
CREATE INDEX idx_ingestion_batches_date ON ingestion_batches(date_received);
CREATE INDEX idx_ingestion_batches_ingested_by ON ingestion_batches(ingested_by);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_batches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DEVICE REGISTRY POLICIES
-- ============================================

-- Admin/Back Office: See all devices
CREATE POLICY "Admin and Back Office can view all devices"
  ON device_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Technicians: See only their assigned devices
CREATE POLICY "Technicians can view their devices"
  ON device_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND up.role = 'user'
      AND device_registry.current_holder_type = 'Technician'
      AND device_registry.current_holder_id = pop.tech_id
    )
  );

-- Insert policy for admin/back_office
CREATE POLICY "Admin and Back Office can insert devices"
  ON device_registry FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Update policy for admin/back_office
CREATE POLICY "Admin and Back Office can update devices"
  ON device_registry FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- ============================================
-- REPAIR TICKETS POLICIES
-- ============================================

-- Admin/Back Office: See all repair tickets
CREATE POLICY "Admin and Back Office can view all repair tickets"
  ON repair_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Technicians: See only their reported tickets
CREATE POLICY "Technicians can view their repair tickets"
  ON repair_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND up.role = 'user'
      AND repair_tickets.reported_by = pop.tech_id
    )
  );

-- Anyone can create repair tickets (to report faults)
CREATE POLICY "Authenticated users can create repair tickets"
  ON repair_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin/Back Office can update repair tickets
CREATE POLICY "Admin and Back Office can update repair tickets"
  ON repair_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- ============================================
-- DEVICE MOVEMENTS POLICIES
-- ============================================

-- Admin/Back Office: See all movements
CREATE POLICY "Admin and Back Office can view all movements"
  ON device_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Technicians: See movements they performed
CREATE POLICY "Technicians can view their movements"
  ON device_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND up.role = 'user'
      AND device_movements.performed_by = pop.tech_id
    )
  );

-- Authenticated users can create movements
CREATE POLICY "Authenticated users can create movements"
  ON device_movements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- INGESTION BATCHES POLICIES
-- ============================================

-- Admin/Back Office only
CREATE POLICY "Admin and Back Office can manage ingestion batches"
  ON ingestion_batches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_device_registry_updated_at
  BEFORE UPDATE ON device_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repair_tickets_updated_at
  BEFORE UPDATE ON repair_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- Available stock view (for ordering - replaces stock_levels aggregation)
CREATE VIEW available_stock AS
SELECT
  device_type,
  item_category,
  current_holder_id as warehouse,
  COUNT(*) as quantity
FROM device_registry
WHERE status = 'Available'
  AND current_holder_type = 'Warehouse'
GROUP BY device_type, item_category, current_holder_id;

-- Device summary by status
CREATE VIEW device_summary AS
SELECT
  item_category,
  device_type,
  status,
  COUNT(*) as count
FROM device_registry
GROUP BY item_category, device_type, status;

-- Repair queue view
CREATE VIEW repair_queue AS
SELECT
  rt.*,
  dr.serial_number,
  dr.device_type,
  dr.item_category
FROM repair_tickets rt
JOIN device_registry dr ON rt.device_id = dr.id
WHERE rt.status NOT IN ('Returned', 'Decommissioned')
ORDER BY rt.created_at DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE device_registry IS 'Master record for all serialized devices in the system';
COMMENT ON TABLE repair_tickets IS 'Fault reporting and repair workflow tracking';
COMMENT ON TABLE device_movements IS 'Complete audit trail of device movements';
COMMENT ON TABLE ingestion_batches IS 'Stock ingestion batch history';

COMMENT ON COLUMN device_registry.current_holder_type IS 'Who currently holds the device: Warehouse, Technician, or Vendor';
COMMENT ON COLUMN device_registry.current_holder_id IS 'ID of current holder (warehouse name, tech_id, or vendor_id)';
COMMENT ON COLUMN device_registry.status IS 'Current lifecycle status of the device';

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE repair_tickets_ticket_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE ingestion_batches_batch_number_seq TO authenticated;
