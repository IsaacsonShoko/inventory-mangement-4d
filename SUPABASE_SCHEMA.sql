-- Supabase Schema for Inventory Management System
-- Migrated from Airtable

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE dispatch_status_enum AS ENUM (
  'Pending',
  'Dispatched',
  'Partial',
  'Cancelled',
  'Returned'
);

CREATE TYPE pick_status_enum AS ENUM (
  'Pending',
  'Picked',
  'Partially Picked',
  'Not Picked'
);

CREATE TYPE stock_availability_enum AS ENUM (
  'Available',
  'Not Available',
  'Backordered',
  'Partial'
);

CREATE TYPE dispatch_method_enum AS ENUM (
  'Courier',
  'In-house Delivery',
  'Pickup',
  'Other'
);

CREATE TYPE business_line_enum AS ENUM (
  'Absa',
  'Cash Connect',
  'VPS',
  'Modems',
  'Accessories',
  'Sim Management',
  'Other'
);

CREATE TYPE item_nature_enum AS ENUM (
  'Serialised',
  'Non-serialised'
);

CREATE TYPE delivery_party_enum AS ENUM (
  'Technician',
  'Regional Warehouse',
  'Non Technician'
);

CREATE TYPE dispatch_or_order_enum AS ENUM (
  'Dispatch',
  'Order'
);

CREATE TYPE user_role_enum AS ENUM (
  'admin',
  'back_office',
  'user'
);

-- ============================================
-- TABLES
-- ============================================

-- 0. USER_PROFILES (Authentication & Roles)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role_enum NOT NULL DEFAULT 'user',
  warehouse TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 1. INVENTORY_ITEMS (Product Catalog)
CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL UNIQUE,
  item_url TEXT,
  item_category business_line_enum,
  item_description TEXT,
  item_nature item_nature_enum,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_items_category_nature ON inventory_items(item_category, item_nature);

-- 2. POINT_OF_PRESENCE (Technicians & Contractors)
CREATE TABLE point_of_presence (
  id BIGSERIAL PRIMARY KEY,
  tech_id TEXT,
  name_surname TEXT NOT NULL,
  contractor TEXT,
  region TEXT,
  email_address TEXT,
  contact_number TEXT,
  mobile TEXT,
  area_based TEXT,
  location_code TEXT,
  physical_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Training & Certification
  tech_id_no TEXT,
  mie_date DATE,
  absa_bin_created_date DATE,
  absa_xlink_pop TEXT,
  absa_training_completed TEXT,
  ad TEXT,
  systems TEXT,
  wiki_updated TEXT,
  poly_graph_date DATE,
  cc_training_start_date DATE,
  cc_training_end_date DATE,
  cc_ride_along_completed TEXT,
  mrm TEXT,
  sap TEXT,
  safe_control_skipper_app TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_point_of_presence_contractor_region ON point_of_presence(contractor, region);
CREATE INDEX idx_point_of_presence_name ON point_of_presence(name_surname);

-- 3. UNIQUE_ORDERS (Master Orders Table)
CREATE TABLE unique_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGSERIAL UNIQUE NOT NULL, -- Auto-increment field
  date_ordered TIMESTAMP NOT NULL,
  item_category business_line_enum,
  item_nature item_nature_enum,
  quantity_ordered INTEGER,
  
  -- Location & Party Info
  region TEXT,
  contractor_company TEXT,
  technician TEXT,
  ordered_by TEXT NOT NULL,
  deliver_to_part delivery_party_enum,
  on_behalf_of TEXT,
  pop_id TEXT,
  order_location TEXT,
  warehouse_fulfilling TEXT,
  
  -- Recipient Info
  recipient_name TEXT,
  recipient_company_name TEXT,
  recipient_address TEXT,
  recipient_contact_number TEXT,
  recipient_email_address TEXT,
  cell_phone_number TEXT,
  
  -- Status Fields
  dispatch_status dispatch_status_enum DEFAULT 'Pending',
  stock_availability stock_availability_enum,
  pick_status pick_status_enum DEFAULT 'Pending',
  dispatch_method dispatch_method_enum,
  
  -- Additional Fields
  waybill_number TEXT,
  order_notes TEXT,
  order_summary_ai TEXT, -- AI Generated summary
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unique_orders_dispatch_pick_status ON unique_orders(dispatch_status, pick_status, date_ordered);
CREATE INDEX idx_unique_orders_date_ordered ON unique_orders(date_ordered DESC);
CREATE INDEX idx_unique_orders_category ON unique_orders(item_category);

-- 4. STOCK_ORDER (Line Items)
CREATE TABLE stock_order (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES unique_orders(order_id),
  unique_order_record_id BIGINT NOT NULL REFERENCES unique_orders(id),
  
  device_type TEXT NOT NULL,
  date_ordered DATE,
  quantity_ordered INTEGER NOT NULL,
  qty_dispatched INTEGER DEFAULT 0,
  
  -- Item Info
  item_category business_line_enum,
  item_description TEXT,
  item_nature item_nature_enum,
  
  -- Fulfillment Info
  contractor_company TEXT,
  region TEXT,
  technician TEXT,
  ordered_by TEXT,
  order_location TEXT,
  dispatch_to TEXT,
  warehouse_fulfilling TEXT,
  tech_email TEXT,
  
  -- Status Fields
  pick_status pick_status_enum DEFAULT 'Pending',
  dispatch_status dispatch_status_enum DEFAULT 'Pending',
  stock_availability stock_availability_enum,
  dispatch_or_order dispatch_or_order_enum,

  -- Reference
  waybill_number TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_order_order_id ON stock_order(order_id);
CREATE INDEX idx_stock_order_unique_order_record_id ON stock_order(unique_order_record_id);
CREATE INDEX idx_stock_order_pick_dispatch_status ON stock_order(pick_status, dispatch_status);
CREATE INDEX idx_stock_order_device_type ON stock_order(device_type);

-- 5. DISPATCH_LOG (Dispatch Events)
CREATE TABLE dispatch_log (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES unique_orders(order_id),
  unique_order_record_id BIGINT REFERENCES unique_orders(id),
  stock_order_id BIGINT REFERENCES stock_order(id),
  
  date_dispatched DATE NOT NULL,
  
  -- Item Info
  item_category TEXT,
  item_nature TEXT,
  item_description TEXT,
  device_type TEXT,
  quantity INTEGER,
  
  -- Location & Party
  contractor_company TEXT,
  region TEXT,
  technician TEXT,
  warehouse_fulfilling TEXT,
  
  -- Serial Numbers (for serialized items)
  terminal_serial_number TEXT,
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  cashconnect_serial_number TEXT,
  
  -- Packing Details
  charger_packed TEXT, -- 'Yes' or 'No'
  cables TEXT, -- 'Yes' or 'No'
  packer TEXT,
  dispatcher TEXT,
  
  -- Shipping
  dispatch_method dispatch_method_enum,
  waybill_number TEXT,
  package_reference TEXT,
  
  -- Status at dispatch
  stock_availability TEXT,
  pick_status TEXT,
  
  shipped BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispatch_log_order_id ON dispatch_log(order_id);
CREATE INDEX idx_dispatch_log_unique_order_record_id ON dispatch_log(unique_order_record_id);
CREATE INDEX idx_dispatch_log_stock_order_id ON dispatch_log(stock_order_id);
CREATE INDEX idx_dispatch_log_date_dispatched ON dispatch_log(date_dispatched DESC);

-- ============================================
-- VIEWS (Optional - for convenience)
-- ============================================

-- View: Orders Ready for Picking
CREATE VIEW orders_pending_pick AS
SELECT 
  uo.id,
  uo.order_id,
  uo.date_ordered,
  uo.item_category,
  uo.quantity_ordered,
  uo.technician,
  uo.recipient_name,
  COUNT(so.id) as line_item_count
FROM unique_orders uo
LEFT JOIN stock_order so ON uo.id = so.unique_order_record_id
WHERE uo.pick_status IN ('Pending', NULL)
GROUP BY uo.id, uo.order_id, uo.date_ordered, uo.item_category, 
         uo.quantity_ordered, uo.technician, uo.recipient_name
ORDER BY uo.date_ordered ASC;

-- View: Orders Ready for Dispatch
CREATE VIEW orders_ready_dispatch AS
SELECT 
  uo.id,
  uo.order_id,
  uo.date_ordered,
  uo.item_category,
  uo.quantity_ordered,
  uo.pick_status,
  uo.dispatch_status,
  COUNT(dl.id) as dispatch_log_count
FROM unique_orders uo
LEFT JOIN dispatch_log dl ON uo.id = dl.unique_order_record_id
WHERE uo.pick_status IN ('Picked', 'Partially Picked')
  AND uo.dispatch_status IN ('Pending', NULL)
GROUP BY uo.id, uo.order_id, uo.date_ordered, uo.item_category, 
         uo.quantity_ordered, uo.pick_status, uo.dispatch_status
ORDER BY uo.date_ordered ASC;

-- ============================================
-- TRIGGERS (for timestamp updates)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_point_of_presence_updated_at
  BEFORE UPDATE ON point_of_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_unique_orders_updated_at
  BEFORE UPDATE ON unique_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_order_updated_at
  BEFORE UPDATE ON stock_order
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_dispatch_log_updated_at
  BEFORE UPDATE ON dispatch_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE unique_orders IS 'Master order records aggregating line items with overall status tracking';
COMMENT ON TABLE stock_order IS 'Individual line items for each product in an order';
COMMENT ON TABLE dispatch_log IS 'Dispatch event records with fulfillment details';
COMMENT ON TABLE inventory_items IS 'Master product catalog';
COMMENT ON TABLE point_of_presence IS 'Technician and contractor directory';

COMMENT ON COLUMN unique_orders.order_id IS 'Auto-increment order number, formatted as ORD-XXXX in application';
COMMENT ON COLUMN stock_order.qty_dispatched IS 'Quantity physically picked/dispatched';
COMMENT ON COLUMN dispatch_log.charger_packed IS 'Yes/No string indicating charger inclusion';
COMMENT ON COLUMN dispatch_log.cables IS 'Yes/No string indicating cables inclusion';

