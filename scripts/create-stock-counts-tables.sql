-- Stock Counts Tables for Supabase
-- Run this in Supabase SQL Editor

-- Create enum types for stock counts
CREATE TYPE count_type AS ENUM ('Monthly', 'Mid-Month', 'Daily');
CREATE TYPE item_status_type AS ENUM ('In Stock', 'Allocated', 'Dispatched', 'Faulty', 'Missing', 'Returned');
CREATE TYPE stock_holder_type AS ENUM ('Warehouse', 'Technician', 'Customer', 'In Transit');
CREATE TYPE overall_condition_type AS ENUM ('Good', 'Fair', 'Poor', 'Damaged', 'Faulty');

-- Stock Levels table (current inventory)
CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL,
  item_description TEXT,
  item_category business_line_enum, -- reusing existing enum
  item_nature item_nature_enum, -- reusing existing enum
  item_code TEXT,
  bin_location TEXT,
  quantity INTEGER DEFAULT 0,
  manufacture_serial_number TEXT,
  qr_code_serial_number TEXT,
  xlink_serial_number TEXT,
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  stock_holder TEXT,
  name_or_location TEXT,
  contractor_company TEXT,
  contractor_region TEXT,
  technician_name TEXT,
  tech_id TEXT,
  item_status TEXT,
  fault_reason TEXT,
  overall_condition TEXT,
  xli_case_ref TEXT,
  count_type count_type DEFAULT 'Monthly',
  count_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Counts table (rolled up counts / historical records)
CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  count_type count_type NOT NULL DEFAULT 'Monthly',
  stock_holder TEXT,
  name_or_location TEXT,
  item_category business_line_enum,
  bin_location TEXT,
  device_type TEXT NOT NULL,
  item_nature item_nature_enum,
  item_code TEXT,
  item_description TEXT,
  quantity INTEGER DEFAULT 0,
  manufacture_serial_number TEXT,
  qr_code_serial_number TEXT,
  xlink_serial_number TEXT,
  cradle_serial_number TEXT,
  charger_serial_number TEXT,
  item_status TEXT,
  fault_reason TEXT,
  overall_condition TEXT,
  xli_case_ref TEXT,
  contractor_company TEXT,
  contractor_region TEXT,
  technician_name TEXT,
  tech_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_stock_levels_device_type ON stock_levels(device_type);
CREATE INDEX idx_stock_levels_item_category ON stock_levels(item_category);
CREATE INDEX idx_stock_levels_item_nature ON stock_levels(item_nature);
CREATE INDEX idx_stock_levels_stock_holder ON stock_levels(stock_holder);
CREATE INDEX idx_stock_levels_tech_id ON stock_levels(tech_id);

CREATE INDEX idx_stock_counts_device_type ON stock_counts(device_type);
CREATE INDEX idx_stock_counts_item_category ON stock_counts(item_category);
CREATE INDEX idx_stock_counts_count_type ON stock_counts(count_type);
CREATE INDEX idx_stock_counts_created_at ON stock_counts(created_at);

-- Enable Row Level Security
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_levels
CREATE POLICY "Allow authenticated read on stock_levels"
  ON stock_levels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on stock_levels"
  ON stock_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on stock_levels"
  ON stock_levels
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on stock_levels"
  ON stock_levels
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for stock_counts
CREATE POLICY "Allow authenticated read on stock_counts"
  ON stock_counts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on stock_counts"
  ON stock_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on stock_counts"
  ON stock_counts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on stock_counts"
  ON stock_counts
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_levels_updated_at
  BEFORE UPDATE ON stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_updated_at();

CREATE TRIGGER stock_counts_updated_at
  BEFORE UPDATE ON stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_updated_at();
