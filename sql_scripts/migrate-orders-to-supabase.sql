-- Migration Script: Orders System from Airtable to Supabase
-- This script creates all tables needed for the Stock Order, Picking, and Dispatch system

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Delivery party options
CREATE TYPE delivery_party_enum AS ENUM (
  'Technician',
  'Regional Warehouse',
  'Non Technician'
);

-- Item nature (serialized vs non-serialized)
CREATE TYPE item_nature_enum AS ENUM (
  'Serialised',
  'Non-serialised'
);

-- Item categories
CREATE TYPE item_category_enum AS ENUM (
  'Accessories',
  'Absa',
  'Cash Connect',
  'Modems',
  'Sim Management',
  'VPS',
  'Other'
);

-- Order dispatch status
CREATE TYPE dispatch_status_enum AS ENUM (
  'Pending',
  'Partially Dispatched',
  'Dispatched',
  'Cancelled'
);

-- Pick status
CREATE TYPE pick_status_enum AS ENUM (
  'Not Picked',
  'Partially Picked',
  'Picked'
);

-- Stock availability
CREATE TYPE stock_availability_enum AS ENUM (
  'In Stock',
  'Out of Stock',
  'Partial'
);

-- Dispatch method
CREATE TYPE dispatch_method_enum AS ENUM (
  'Courier',
  'Collection',
  'Internal Transfer'
);

-- ============================================================================
-- INVENTORY CATALOG TABLE
-- ============================================================================

CREATE TABLE inventory_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL,
  item_description TEXT,
  item_category item_category_enum NOT NULL,
  item_nature item_nature_enum NOT NULL,
  item_url TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_inventory_catalog_category ON inventory_catalog(item_category);
CREATE INDEX idx_inventory_catalog_nature ON inventory_catalog(item_nature);
CREATE INDEX idx_inventory_catalog_active ON inventory_catalog(is_active);

-- ============================================================================
-- POINT OF PRESENCE (TECHNICIANS/LOCATIONS)
-- ============================================================================

CREATE TABLE point_of_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_surname TEXT NOT NULL,
  contractor TEXT NOT NULL,
  region TEXT NOT NULL,
  email_address TEXT,
  area_based TEXT,
  location_code TEXT,
  contact_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pop_contractor ON point_of_presence(contractor);
CREATE INDEX idx_pop_region ON point_of_presence(region);
CREATE INDEX idx_pop_active ON point_of_presence(is_active);

-- ============================================================================
-- ORDERS TABLE (Main order header - replaces Unique_Orders)
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE,
  date_ordered DATE NOT NULL DEFAULT CURRENT_DATE,
  item_category item_category_enum NOT NULL,
  item_nature item_nature_enum NOT NULL,

  -- Delivery information
  delivery_party delivery_party_enum NOT NULL,
  contractor_company TEXT,
  region TEXT,
  technician TEXT,
  pop_id UUID REFERENCES point_of_presence(id),

  -- Recipient details (for non-technician deliveries)
  recipient_name TEXT,
  recipient_company_name TEXT,
  recipient_address TEXT,
  recipient_contact_number TEXT,
  recipient_email TEXT,

  -- Order metadata
  ordered_by TEXT NOT NULL,
  on_behalf_of TEXT,
  order_location TEXT,
  cellphone_number TEXT,

  -- Status tracking
  quantity_ordered INTEGER DEFAULT 0,
  dispatch_status dispatch_status_enum DEFAULT 'Pending',
  pick_status pick_status_enum,
  stock_availability stock_availability_enum,

  -- Fulfillment details
  dispatch_method dispatch_method_enum,
  waybill_number TEXT,
  warehouse_fulfilling TEXT,

  -- Notes
  order_notes TEXT,
  order_summary_ai TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_orders_date ON orders(date_ordered DESC);
CREATE INDEX idx_orders_status ON orders(dispatch_status);
CREATE INDEX idx_orders_pick_status ON orders(pick_status);
CREATE INDEX idx_orders_category ON orders(item_category);
CREATE INDEX idx_orders_ordered_by ON orders(ordered_by);

-- ============================================================================
-- ORDER LINE ITEMS (replaces Stock_Order table)
-- ============================================================================

CREATE TABLE order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Item details
  inventory_item_id UUID REFERENCES inventory_catalog(id),
  device_type TEXT NOT NULL,
  item_description TEXT,
  item_category item_category_enum,
  item_nature item_nature_enum,
  item_url TEXT,

  -- Quantities
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_dispatched INTEGER DEFAULT 0,

  -- Picking details
  pick_status pick_status_enum DEFAULT 'Not Picked',
  stock_availability stock_availability_enum,

  -- Serial numbers (for serialized items)
  terminal_serial_number TEXT,
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  cashconnect_serial_number TEXT,

  -- Packing details
  charger_packed TEXT,
  cables TEXT,
  packer TEXT,
  package_reference TEXT,
  item_code TEXT,

  -- Fulfillment
  dispatch_method dispatch_method_enum,
  warehouse_fulfilling TEXT,
  waybill_number TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_order_lines_order ON order_line_items(order_id);
CREATE INDEX idx_order_lines_pick_status ON order_line_items(pick_status);
CREATE INDEX idx_order_lines_device ON order_line_items(device_type);

-- ============================================================================
-- DISPATCH LOG TABLE
-- ============================================================================

CREATE TABLE dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  order_line_item_id UUID REFERENCES order_line_items(id),

  -- Dispatch details
  date_dispatched TIMESTAMPTZ DEFAULT now(),
  dispatcher TEXT,
  dispatch_to_location TEXT,

  -- Item info
  item_category item_category_enum,
  item_nature item_nature_enum,
  item_description TEXT,
  device_type TEXT,
  quantity INTEGER DEFAULT 1,

  -- Recipient info (copied from order)
  contractor_company TEXT,
  region TEXT,
  technician TEXT,

  -- Shipping details
  dispatch_method dispatch_method_enum,
  waybill_number TEXT,
  package_reference TEXT,
  warehouse_fulfilling TEXT,
  shipped BOOLEAN DEFAULT false,

  -- Serial numbers
  terminal_serial_number TEXT,
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  cashconnect_serial_number TEXT,

  -- Packing
  charger_packed TEXT,
  cables TEXT,
  packer TEXT,
  item_code TEXT,

  -- Timestamps
  time_picked TIMESTAMPTZ,
  time_dispatched TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dispatch_log_order ON dispatch_log(order_id);
CREATE INDEX idx_dispatch_log_date ON dispatch_log(date_dispatched DESC);
CREATE INDEX idx_dispatch_log_line_item ON dispatch_log(order_line_item_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE inventory_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_of_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_log ENABLE ROW LEVEL SECURITY;

-- Inventory Catalog: Everyone can read, only admin/back_office can write
CREATE POLICY "Anyone can view inventory catalog"
  ON inventory_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and back_office can manage inventory catalog"
  ON inventory_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'back_office')
    )
  );

-- Point of Presence: Everyone can read, only admin/back_office can write
CREATE POLICY "Anyone can view point of presence"
  ON point_of_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and back_office can manage point of presence"
  ON point_of_presence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'back_office')
    )
  );

-- Orders: Everyone can read, authenticated users can create, admin/back_office can update
CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin and back_office can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'back_office')
    )
  );

-- Order Line Items: Same as orders
CREATE POLICY "Anyone can view order line items"
  ON order_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order line items"
  ON order_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin and back_office can update order line items"
  ON order_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'back_office')
    )
  );

-- Dispatch Log: Everyone can read, only back_office/admin can write
CREATE POLICY "Anyone can view dispatch log"
  ON dispatch_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and back_office can manage dispatch log"
  ON dispatch_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'back_office')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to format order number as ORD-XXXX
CREATE OR REPLACE FUNCTION format_order_number(num INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || LPAD(num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update order totals when line items change
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET
    quantity_ordered = (
      SELECT COALESCE(SUM(quantity_ordered), 0)
      FROM order_line_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order totals
CREATE TRIGGER trigger_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_totals();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trigger_inventory_catalog_updated
  BEFORE UPDATE ON inventory_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_pop_updated
  BEFORE UPDATE ON point_of_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_order_lines_updated
  BEFORE UPDATE ON order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for picking queue (orders needing to be picked)
CREATE VIEW picking_queue AS
SELECT
  o.*,
  format_order_number(o.order_number) as formatted_order_number,
  (
    SELECT COUNT(*)
    FROM order_line_items oli
    WHERE oli.order_id = o.id
  ) as total_line_items,
  (
    SELECT COUNT(*)
    FROM order_line_items oli
    WHERE oli.order_id = o.id
    AND oli.pick_status = 'Picked'
  ) as picked_line_items
FROM orders o
WHERE o.pick_status IS NULL
   OR o.pick_status = 'Not Picked'
   OR o.pick_status = 'Partially Picked'
ORDER BY o.date_ordered ASC, o.item_category ASC;

-- View for dispatch queue (orders ready to dispatch)
CREATE VIEW dispatch_queue AS
SELECT
  o.*,
  format_order_number(o.order_number) as formatted_order_number,
  (
    SELECT COUNT(*)
    FROM dispatch_log dl
    WHERE dl.order_id = o.id
  ) as dispatch_entries
FROM orders o
WHERE o.pick_status = 'Picked'
  AND (o.dispatch_status IS NULL OR o.dispatch_status = 'Pending' OR o.dispatch_status = 'Partially Dispatched')
ORDER BY o.date_ordered ASC, o.item_category ASC;

-- Grant access to views
GRANT SELECT ON picking_queue TO authenticated;
GRANT SELECT ON dispatch_queue TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE inventory_catalog IS 'Product catalog of available inventory items';
COMMENT ON TABLE point_of_presence IS 'Technicians and delivery locations';
COMMENT ON TABLE orders IS 'Main order headers with delivery and status information';
COMMENT ON TABLE order_line_items IS 'Individual line items within an order';
COMMENT ON TABLE dispatch_log IS 'Log of all dispatched items with serial numbers and tracking';
