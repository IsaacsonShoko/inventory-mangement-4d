# Technical Implementation Specification
## Asset Management & Stock Ingestion Modules

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Supabase Services](#supabase-services)
4. [React Query Hooks](#react-query-hooks)
5. [Components & Pages](#components--pages)
6. [Validation Schemas](#validation-schemas)
7. [Access Control](#access-control)
8. [N8N Webhook Integration](#n8n-webhook-integration)

---

## Overview

### Modules to Implement

| Module | Path | Access | Description |
|--------|------|--------|-------------|
| Stock Ingestion | `/stock-ingestion` | Back Office, Admin | Register new stock into device registry |
| Asset Management | `/asset-management` | All (filtered) | Device lifecycle management with tabs |

### Asset Management Tabs

| Tab | Path | Description |
|-----|------|-------------|
| Registry | `/asset-management?tab=registry` | View all tracked devices |
| Installations | `/asset-management?tab=installations` | Device deployment tracking |
| Repairs | `/asset-management?tab=repairs` | Fault assessment & repair workflow |
| Movements | `/asset-management?tab=movements` | Device audit trail |

---

## Database Schema

### Migration File: `create-asset-management-tables.sql`

```sql
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
  -- Arrival Issues
  'Dead On Arrival',
  -- Physical Damage
  'Screen Damaged',
  'Cradle/Charger Damaged',
  'Enclosure Damaged',
  'Port/Connector Damaged',
  -- Hardware Failure
  'Battery Failure',
  'Printer Malfunction',
  'Card Reader Failure',
  'Keypad Malfunction',
  'Speaker/Mic Failure',
  -- Software/Connectivity
  'Software Error',
  'Connectivity Issues',
  'Firmware Corruption',
  'SIM/Network Failure',
  -- Environmental
  'Water Damage',
  'Heat Damage',
  -- Security
  'Theft/Tampering',
  -- Other
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

-- Installation status
CREATE TYPE installation_status_enum AS ENUM (
  'Active',
  'Removed',
  'Replaced'
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

-- 2. VENDORS (Installation Sites)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_code TEXT UNIQUE,

  -- Location
  address TEXT,
  city TEXT,
  region TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Contact
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Classification
  vendor_type TEXT,
  business_line TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for vendors
CREATE INDEX idx_vendors_name ON vendors(vendor_name);
CREATE INDEX idx_vendors_region ON vendors(region);
CREATE INDEX idx_vendors_business_line ON vendors(business_line);

-- 3. INSTALLATIONS (Device Deployments)
CREATE TABLE installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES device_registry(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),

  -- Installation Details
  installed_by TEXT NOT NULL,
  installation_date TIMESTAMP NOT NULL,
  installation_notes TEXT,

  -- Status
  status installation_status_enum NOT NULL DEFAULT 'Active',
  removal_date TIMESTAMP,
  removed_by TEXT,
  removal_reason TEXT,

  -- Replacement Tracking
  replaced_by_device_id UUID REFERENCES device_registry(id),
  replaces_device_id UUID REFERENCES device_registry(id),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for installations
CREATE INDEX idx_installations_device ON installations(device_id);
CREATE INDEX idx_installations_vendor ON installations(vendor_id);
CREATE INDEX idx_installations_status ON installations(status);
CREATE INDEX idx_installations_installed_by ON installations(installed_by);
CREATE INDEX idx_installations_date ON installations(installation_date);

-- 4. REPAIR TICKETS (Fault & Repair Workflow)
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

-- 5. DEVICE MOVEMENTS (Audit Trail)
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

-- 6. INGESTION BATCHES (Stock Ingestion History)
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

-- 7. EXCEPTION LOG (Reconciliation Tracking)
CREATE TABLE exception_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type TEXT NOT NULL,

  -- Reference
  device_serial TEXT,
  device_registry_id UUID REFERENCES device_registry(id),
  stock_count_id UUID,

  -- Details
  description TEXT,
  expected_value TEXT,
  actual_value TEXT,

  -- Resolution
  status TEXT DEFAULT 'Open',
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Indexes for exception_log
CREATE INDEX idx_exception_log_type ON exception_log(exception_type);
CREATE INDEX idx_exception_log_status ON exception_log(status);
CREATE INDEX idx_exception_log_device_serial ON exception_log(device_serial);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_log ENABLE ROW LEVEL SECURITY;

-- Device Registry Policies
-- Admin/Back Office: See all
CREATE POLICY "Admin and Back Office can view all devices"
  ON device_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Technicians: See only their devices
CREATE POLICY "Technicians can view their devices"
  ON device_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND up.role = 'user'
      AND device_registry.current_holder_id = pop.tech_id
    )
  );

-- Insert/Update policies for admin/back_office
CREATE POLICY "Admin and Back Office can insert devices"
  ON device_registry FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

CREATE POLICY "Admin and Back Office can update devices"
  ON device_registry FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Similar policies for other tables...
-- Vendors: Admin/Back Office only
CREATE POLICY "Admin and Back Office can manage vendors"
  ON vendors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
  );

-- Installations: Filtered by technician
CREATE POLICY "View installations"
  ON installations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND installations.installed_by = pop.tech_id
    )
  );

-- Repair Tickets: Filtered by technician
CREATE POLICY "View repair tickets"
  ON repair_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'back_office')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN point_of_presence pop ON up.email = pop.email_address
      WHERE up.id = auth.uid()
      AND repair_tickets.reported_by = pop.tech_id
    )
  );

-- Ingestion Batches: Admin/Back Office only
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_registry_updated_at
  BEFORE UPDATE ON device_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_installations_updated_at
  BEFORE UPDATE ON installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repair_tickets_updated_at
  BEFORE UPDATE ON repair_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- Available stock view (for ordering)
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

-- Device summary view
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
```

---

## Supabase Services

### File: `src/integrations/supabase/services-asset.ts`

```typescript
import { supabase } from './client';
import type { Database } from './types';

// Type exports
export type DeviceRegistry = Database['public']['Tables']['device_registry']['Row'];
export type DeviceRegistryInsert = Database['public']['Tables']['device_registry']['Insert'];
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type Installation = Database['public']['Tables']['installations']['Row'];
export type RepairTicket = Database['public']['Tables']['repair_tickets']['Row'];
export type DeviceMovement = Database['public']['Tables']['device_movements']['Row'];
export type IngestionBatch = Database['public']['Tables']['ingestion_batches']['Row'];
export type ExceptionLog = Database['public']['Tables']['exception_log']['Row'];

// ======================
// DEVICE REGISTRY SERVICE
// ======================

export const deviceRegistryService = {
  // Get all devices (RLS handles filtering)
  async getAll(filters?: {
    status?: string;
    category?: string;
    deviceType?: string;
    holderType?: string;
    holderId?: string;
    search?: string;
  }) {
    let query = supabase
      .from('device_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('item_category', filters.category);
    }
    if (filters?.deviceType) {
      query = query.eq('device_type', filters.deviceType);
    }
    if (filters?.holderType) {
      query = query.eq('current_holder_type', filters.holderType);
    }
    if (filters?.holderId) {
      query = query.eq('current_holder_id', filters.holderId);
    }
    if (filters?.search) {
      query = query.or(
        `serial_number.ilike.%${filters.search}%,device_type.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get single device by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get device by serial number
  async getBySerial(serialNumber: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('serial_number', serialNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Check if serial exists
  async checkSerialExists(serialNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('device_registry')
      .select('id')
      .eq('serial_number', serialNumber)
      .single();

    if (error && error.code === 'PGRST116') return false;
    if (error) throw error;
    return !!data;
  },

  // Create device
  async create(device: DeviceRegistryInsert) {
    const { data, error } = await supabase
      .from('device_registry')
      .insert(device)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk create devices
  async createBulk(devices: DeviceRegistryInsert[]) {
    const { data, error } = await supabase
      .from('device_registry')
      .insert(devices)
      .select();

    if (error) throw error;
    return data;
  },

  // Update device
  async update(id: string, updates: Partial<DeviceRegistry>) {
    const { data, error } = await supabase
      .from('device_registry')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update device status
  async updateStatus(
    id: string,
    status: string,
    holderType?: string,
    holderId?: string
  ) {
    const updates: Partial<DeviceRegistry> = { status: status as any };
    if (holderType) updates.current_holder_type = holderType as any;
    if (holderId) updates.current_holder_id = holderId;

    return this.update(id, updates);
  },

  // Get device counts by status
  async getStatusCounts() {
    const { data, error } = await supabase
      .from('device_registry')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts: Record<string, number> = {};
        data?.forEach((d) => {
          counts[d.status] = (counts[d.status] || 0) + 1;
        });
        return { data: counts, error: null };
      });

    if (error) throw error;
    return data;
  },

  // Get devices for technician
  async getByTechnician(techId: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('current_holder_id', techId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// ======================
// VENDOR SERVICE
// ======================

export const vendorService = {
  async getAll(filters?: { region?: string; businessLine?: string; search?: string }) {
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('vendor_name');

    if (filters?.region) {
      query = query.eq('region', filters.region);
    }
    if (filters?.businessLine) {
      query = query.eq('business_line', filters.businessLine);
    }
    if (filters?.search) {
      query = query.or(
        `vendor_name.ilike.%${filters.search}%,vendor_code.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendor)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Vendor>) {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ======================
// INSTALLATION SERVICE
// ======================

export const installationService = {
  async getAll(filters?: {
    status?: string;
    installedBy?: string;
    vendorId?: string;
  }) {
    let query = supabase
      .from('installations')
      .select(`
        *,
        device:device_registry(*),
        vendor:vendors(*)
      `)
      .order('installation_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.installedBy) {
      query = query.eq('installed_by', filters.installedBy);
    }
    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getByDevice(deviceId: string) {
    const { data, error } = await supabase
      .from('installations')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('device_id', deviceId)
      .order('installation_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(installation: Omit<Installation, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('installations')
      .insert(installation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async remove(id: string, removedBy: string, reason: string) {
    const { data, error } = await supabase
      .from('installations')
      .update({
        status: 'Removed',
        removal_date: new Date().toISOString(),
        removed_by: removedBy,
        removal_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getActiveByVendor(vendorId: string) {
    const { data, error } = await supabase
      .from('installations')
      .select(`
        *,
        device:device_registry(*)
      `)
      .eq('vendor_id', vendorId)
      .eq('status', 'Active');

    if (error) throw error;
    return data;
  },
};

// ======================
// REPAIR TICKET SERVICE
// ======================

export const repairTicketService = {
  async getAll(filters?: {
    status?: string;
    reportedBy?: string;
    faultCategory?: string;
  }) {
    let query = supabase
      .from('repair_tickets')
      .select(`
        *,
        device:device_registry(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.reportedBy) {
      query = query.eq('reported_by', filters.reportedBy);
    }
    if (filters?.faultCategory) {
      query = query.eq('fault_category', filters.faultCategory);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('repair_tickets')
      .select(`
        *,
        device:device_registry(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByDevice(deviceId: string) {
    const { data, error } = await supabase
      .from('repair_tickets')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(
    ticket: Omit<RepairTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>
  ) {
    const { data, error } = await supabase
      .from('repair_tickets')
      .insert(ticket)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string, additionalData?: Partial<RepairTicket>) {
    const updates: Partial<RepairTicket> = {
      status: status as any,
      ...additionalData,
    };

    const { data, error } = await supabase
      .from('repair_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async startAssessment(id: string, assessedBy: string) {
    return this.updateStatus(id, 'Assessing', {
      assessed_by: assessedBy,
      assessment_date: new Date().toISOString(),
    });
  },

  async completeAssessment(
    id: string,
    isRepairable: boolean,
    notes: string,
    estimatedHours?: number
  ) {
    return this.updateStatus(id, isRepairable ? 'In-Repair' : 'Decommissioned', {
      is_repairable: isRepairable,
      assessment_notes: notes,
      estimated_repair_hours: estimatedHours,
    });
  },

  async startRepair(id: string, repairedBy: string) {
    return this.updateStatus(id, 'In-Repair', {
      repaired_by: repairedBy,
      repair_start_date: new Date().toISOString(),
    });
  },

  async completeRepair(id: string, actions: string, partsUsed?: string, cost?: number) {
    return this.updateStatus(id, 'Quality-Check', {
      repair_end_date: new Date().toISOString(),
      repair_actions: actions,
      parts_used: partsUsed,
      repair_cost: cost,
    });
  },

  async completeQualityCheck(id: string, checkedBy: string, passed: boolean, notes?: string) {
    return this.updateStatus(id, passed ? 'Repaired' : 'In-Repair', {
      quality_checked_by: checkedBy,
      quality_check_date: new Date().toISOString(),
      quality_check_passed: passed,
      quality_check_notes: notes,
    });
  },

  async returnToStock(id: string, warehouse: string) {
    return this.updateStatus(id, 'Returned', {
      returned_to_stock_date: new Date().toISOString(),
      returned_to_warehouse: warehouse,
    });
  },

  async getRepairMetrics() {
    const { data, error } = await supabase
      .from('repair_tickets')
      .select('status, fault_category, created_at, repair_end_date, repair_start_date');

    if (error) throw error;

    // Calculate metrics
    const metrics = {
      total: data?.length || 0,
      byStatus: {} as Record<string, number>,
      byFaultCategory: {} as Record<string, number>,
      avgRepairTimeHours: 0,
    };

    let totalRepairTime = 0;
    let completedRepairs = 0;

    data?.forEach((ticket) => {
      // Count by status
      metrics.byStatus[ticket.status] = (metrics.byStatus[ticket.status] || 0) + 1;

      // Count by fault category
      if (ticket.fault_category) {
        metrics.byFaultCategory[ticket.fault_category] =
          (metrics.byFaultCategory[ticket.fault_category] || 0) + 1;
      }

      // Calculate repair time
      if (ticket.repair_start_date && ticket.repair_end_date) {
        const start = new Date(ticket.repair_start_date).getTime();
        const end = new Date(ticket.repair_end_date).getTime();
        totalRepairTime += (end - start) / (1000 * 60 * 60); // hours
        completedRepairs++;
      }
    });

    if (completedRepairs > 0) {
      metrics.avgRepairTimeHours = totalRepairTime / completedRepairs;
    }

    return metrics;
  },
};

// ======================
// DEVICE MOVEMENT SERVICE
// ======================

export const deviceMovementService = {
  async getByDevice(deviceId: string) {
    const { data, error } = await supabase
      .from('device_movements')
      .select('*')
      .eq('device_id', deviceId)
      .order('movement_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(movement: Omit<DeviceMovement, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('device_movements')
      .insert(movement)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRecent(limit: number = 50) {
    const { data, error } = await supabase
      .from('device_movements')
      .select(`
        *,
        device:device_registry(serial_number, device_type)
      `)
      .order('movement_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getByPerformer(performedBy: string) {
    const { data, error } = await supabase
      .from('device_movements')
      .select(`
        *,
        device:device_registry(serial_number, device_type)
      `)
      .eq('performed_by', performedBy)
      .order('movement_date', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// ======================
// INGESTION BATCH SERVICE
// ======================

export const ingestionBatchService = {
  async create(batch: Omit<IngestionBatch, 'id' | 'batch_number' | 'created_at'>) {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .insert(batch)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateCounts(id: string, successful: number, failed: number) {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .update({
        successful_count: successful,
        failed_count: failed,
        total_devices: successful + failed,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ======================
// EXCEPTION LOG SERVICE
// ======================

export const exceptionLogService = {
  async getAll(filters?: {
    exceptionType?: string;
    status?: string;
    assignedTo?: string;
  }) {
    let query = supabase
      .from('exception_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.exceptionType) {
      query = query.eq('exception_type', filters.exceptionType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(exception: Omit<ExceptionLog, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('exception_log')
      .insert(exception)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async resolve(id: string, resolvedBy: string, notes: string) {
    const { data, error } = await supabase
      .from('exception_log')
      .update({
        status: 'Resolved',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async assign(id: string, assignedTo: string) {
    const { data, error } = await supabase
      .from('exception_log')
      .update({
        status: 'Investigating',
        assigned_to: assignedTo,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCounts() {
    const { data, error } = await supabase
      .from('exception_log')
      .select('exception_type, status');

    if (error) throw error;

    const counts = {
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      total: data?.length || 0,
    };

    data?.forEach((e) => {
      counts.byType[e.exception_type] = (counts.byType[e.exception_type] || 0) + 1;
      counts.byStatus[e.status || 'Open'] = (counts.byStatus[e.status || 'Open'] || 0) + 1;
    });

    return counts;
  },
};
```

---

## React Query Hooks

### File: `src/hooks/useAssetManagement.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deviceRegistryService,
  vendorService,
  installationService,
  repairTicketService,
  deviceMovementService,
  ingestionBatchService,
  exceptionLogService,
} from '@/integrations/supabase/services-asset';
import { useAuth } from './useAuth';

// ======================
// DEVICE REGISTRY HOOKS
// ======================

export function useDeviceRegistry(filters?: Parameters<typeof deviceRegistryService.getAll>[0]) {
  return useQuery({
    queryKey: ['deviceRegistry', filters],
    queryFn: () => deviceRegistryService.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useDevice(id?: string) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceRegistryService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeviceBySerial(serialNumber?: string) {
  return useQuery({
    queryKey: ['device', 'serial', serialNumber],
    queryFn: () => deviceRegistryService.getBySerial(serialNumber!),
    enabled: !!serialNumber,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckSerialExists() {
  return useMutation({
    mutationFn: (serialNumber: string) => deviceRegistryService.checkSerialExists(serialNumber),
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceRegistryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useCreateDevicesBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceRegistryService.createBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof deviceRegistryService.update>[1] }) =>
      deviceRegistryService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
      queryClient.invalidateQueries({ queryKey: ['device', variables.id] });
    },
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      holderType,
      holderId,
    }: {
      id: string;
      status: string;
      holderType?: string;
      holderId?: string;
    }) => deviceRegistryService.updateStatus(id, status, holderType, holderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
      queryClient.invalidateQueries({ queryKey: ['device', variables.id] });
    },
  });
}

export function useDeviceStatusCounts() {
  return useQuery({
    queryKey: ['deviceRegistry', 'statusCounts'],
    queryFn: () => deviceRegistryService.getStatusCounts(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyDevices() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['deviceRegistry', 'myDevices', profile?.email],
    queryFn: async () => {
      // Get tech_id from point_of_presence using email
      // This would need to be implemented based on your auth setup
      // For now, return empty if not a technician
      return [];
    },
    enabled: !!profile && profile.role === 'user',
    staleTime: 1000 * 60 * 2,
  });
}

// ======================
// VENDOR HOOKS
// ======================

export function useVendors(filters?: Parameters<typeof vendorService.getAll>[0]) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => vendorService.getAll(filters),
    staleTime: 1000 * 60 * 10,
  });
}

export function useVendor(id?: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof vendorService.update>[1] }) =>
      vendorService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
    },
  });
}

// ======================
// INSTALLATION HOOKS
// ======================

export function useInstallations(filters?: Parameters<typeof installationService.getAll>[0]) {
  return useQuery({
    queryKey: ['installations', filters],
    queryFn: () => installationService.getAll(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeviceInstallations(deviceId?: string) {
  return useQuery({
    queryKey: ['installations', 'device', deviceId],
    queryFn: () => installationService.getByDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: installationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installations'] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useRemoveInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, removedBy, reason }: { id: string; removedBy: string; reason: string }) =>
      installationService.remove(id, removedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installations'] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

// ======================
// REPAIR TICKET HOOKS
// ======================

export function useRepairTickets(filters?: Parameters<typeof repairTicketService.getAll>[0]) {
  return useQuery({
    queryKey: ['repairTickets', filters],
    queryFn: () => repairTicketService.getAll(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useRepairTicket(id?: string) {
  return useQuery({
    queryKey: ['repairTicket', id],
    queryFn: () => repairTicketService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeviceRepairHistory(deviceId?: string) {
  return useQuery({
    queryKey: ['repairTickets', 'device', deviceId],
    queryFn: () => repairTicketService.getByDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateRepairTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: repairTicketService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useUpdateRepairTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      additionalData,
    }: {
      id: string;
      status: string;
      additionalData?: Parameters<typeof repairTicketService.updateStatus>[2];
    }) => repairTicketService.updateStatus(id, status, additionalData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repairTickets'] });
      queryClient.invalidateQueries({ queryKey: ['repairTicket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deviceRegistry'] });
    },
  });
}

export function useRepairMetrics() {
  return useQuery({
    queryKey: ['repairTickets', 'metrics'],
    queryFn: () => repairTicketService.getRepairMetrics(),
    staleTime: 1000 * 60 * 5,
  });
}

// ======================
// DEVICE MOVEMENT HOOKS
// ======================

export function useDeviceMovements(deviceId?: string) {
  return useQuery({
    queryKey: ['deviceMovements', deviceId],
    queryFn: () => deviceMovementService.getByDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentMovements(limit: number = 50) {
  return useQuery({
    queryKey: ['deviceMovements', 'recent', limit],
    queryFn: () => deviceMovementService.getRecent(limit),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateDeviceMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceMovementService.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deviceMovements'] });
      queryClient.invalidateQueries({ queryKey: ['deviceMovements', variables.device_id] });
    },
  });
}

// ======================
// INGESTION BATCH HOOKS
// ======================

export function useIngestionBatches() {
  return useQuery({
    queryKey: ['ingestionBatches'],
    queryFn: () => ingestionBatchService.getAll(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useIngestionBatch(id?: string) {
  return useQuery({
    queryKey: ['ingestionBatch', id],
    queryFn: () => ingestionBatchService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateIngestionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingestionBatchService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestionBatches'] });
    },
  });
}

export function useUpdateIngestionBatchCounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, successful, failed }: { id: string; successful: number; failed: number }) =>
      ingestionBatchService.updateCounts(id, successful, failed),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingestionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['ingestionBatch', variables.id] });
    },
  });
}

// ======================
// EXCEPTION LOG HOOKS
// ======================

export function useExceptionLogs(filters?: Parameters<typeof exceptionLogService.getAll>[0]) {
  return useQuery({
    queryKey: ['exceptionLogs', filters],
    queryFn: () => exceptionLogService.getAll(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useExceptionCounts() {
  return useQuery({
    queryKey: ['exceptionLogs', 'counts'],
    queryFn: () => exceptionLogService.getCounts(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exceptionLogService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptionLogs'] });
    },
  });
}

export function useResolveException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolvedBy, notes }: { id: string; resolvedBy: string; notes: string }) =>
      exceptionLogService.resolve(id, resolvedBy, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptionLogs'] });
    },
  });
}

export function useAssignException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      exceptionLogService.assign(id, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptionLogs'] });
    },
  });
}
```

---

## Components & Pages

### File Structure

```
src/
├── pages/
│   ├── StockIngestion.tsx
│   └── AssetManagement.tsx
├── components/
│   └── asset-management/
│       ├── DeviceRegistryTab.tsx
│       ├── InstallationsTab.tsx
│       ├── RepairsTab.tsx
│       ├── MovementsTab.tsx
│       ├── DeviceCard.tsx
│       ├── RepairTicketCard.tsx
│       ├── InstallationCard.tsx
│       ├── MovementTimeline.tsx
│       ├── IngestionForm.tsx
│       ├── IngestionBatchTable.tsx
│       └── DeviceGallery.tsx
```

### Stock Ingestion Page

**File**: `src/pages/StockIngestion.tsx`

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Trash2, Check, X, ScanLine, Upload } from 'lucide-react';

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { BackOfficeRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useInventoryItems, useItemCategories } from '@/hooks/useSupabase';
import {
  useCreateIngestionBatch,
  useCreateDevicesBulk,
  useCheckSerialExists,
  useCreateDeviceMovement,
} from '@/hooks/useAssetManagement';

// Validation schema for batch info
const batchInfoSchema = z.object({
  receivingWarehouse: z.string().min(1, 'Warehouse is required'),
  supplier: z.string().optional(),
  dateReceived: z.date(),
  purchaseOrderNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Validation schema for device entry
const deviceEntrySchema = z.object({
  deviceType: z.string().min(1, 'Device type is required'),
  itemCategory: z.string().min(1, 'Category is required'),
  itemNature: z.string().min(1, 'Item nature is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  cradleSerialNumber: z.string().optional(),
  chargerSerialNumber: z.string().optional(),
  warrantyExpiry: z.date().optional(),
});

type BatchInfoForm = z.infer<typeof batchInfoSchema>;
type DeviceEntryForm = z.infer<typeof deviceEntrySchema>;

interface PendingDevice {
  id: string;
  serialNumber: string;
  deviceType: string;
  itemCategory: string;
  itemNature: string;
  itemDescription?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  warrantyExpiry?: Date;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

function StockIngestionContent() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // State
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [entryMode, setEntryMode] = useState<'scan' | 'manual' | 'bulk'>('scan');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Queries
  const { data: categories } = useItemCategories();
  const { data: inventoryItems } = useInventoryItems({ category: selectedCategory });

  // Mutations
  const createBatch = useCreateIngestionBatch();
  const createDevices = useCreateDevicesBulk();
  const checkSerial = useCheckSerialExists();
  const createMovement = useCreateDeviceMovement();

  // Forms
  const batchForm = useForm<BatchInfoForm>({
    resolver: zodResolver(batchInfoSchema),
    defaultValues: {
      dateReceived: new Date(),
    },
  });

  const deviceForm = useForm<DeviceEntryForm>({
    resolver: zodResolver(deviceEntrySchema),
  });

  // Warehouse options (could be fetched from API)
  const warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C'];

  // Parse Cash Connect QR code
  const parseCashConnectSerial = (qrCode: string): string => {
    if (!qrCode.includes(',')) return qrCode;

    const commaCount = (qrCode.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas: Extract characters 14-18
      return qrCode.substring(13, 18);
    } else {
      // Single comma: Everything after comma
      return qrCode.split(',')[1] || qrCode;
    }
  };

  // Handle barcode scan
  const handleScan = async (result: string) => {
    setShowScanner(false);

    let serialNumber = result;

    // Parse Cash Connect QR codes
    if (selectedCategory === 'Cash Connect' && result.includes(',')) {
      serialNumber = parseCashConnectSerial(result);
    }

    // Check for duplicate
    const exists = await checkSerial.mutateAsync(serialNumber);

    const selectedItem = inventoryItems?.find(i => i.item_name === selectedDevice);

    const newDevice: PendingDevice = {
      id: crypto.randomUUID(),
      serialNumber,
      deviceType: selectedDevice,
      itemCategory: selectedCategory,
      itemNature: selectedItem?.item_nature || 'Serialised',
      itemDescription: selectedItem?.item_description || '',
      status: exists ? 'duplicate' : 'valid',
      errorMessage: exists ? 'Serial already exists in registry' : undefined,
    };

    setPendingDevices(prev => [...prev, newDevice]);

    if (exists) {
      toast.error(`Duplicate serial: ${serialNumber}`);
    } else {
      toast.success(`Added: ${serialNumber}`);
    }
  };

  // Handle manual device entry
  const handleAddDevice = async (data: DeviceEntryForm) => {
    let serialNumber = data.serialNumber;

    // Parse Cash Connect QR codes
    if (data.itemCategory === 'Cash Connect' && data.serialNumber.includes(',')) {
      serialNumber = parseCashConnectSerial(data.serialNumber);
    }

    // Check for duplicate
    const exists = await checkSerial.mutateAsync(serialNumber);

    const selectedItem = inventoryItems?.find(i => i.item_name === data.deviceType);

    const newDevice: PendingDevice = {
      id: crypto.randomUUID(),
      serialNumber,
      deviceType: data.deviceType,
      itemCategory: data.itemCategory,
      itemNature: data.itemNature,
      itemDescription: selectedItem?.item_description || '',
      cradleSerialNumber: data.cradleSerialNumber,
      chargerSerialNumber: data.chargerSerialNumber,
      warrantyExpiry: data.warrantyExpiry,
      status: exists ? 'duplicate' : 'valid',
      errorMessage: exists ? 'Serial already exists in registry' : undefined,
    };

    setPendingDevices(prev => [...prev, newDevice]);

    // Reset serial field for next entry
    deviceForm.setValue('serialNumber', '');
    deviceForm.setValue('cradleSerialNumber', '');
    deviceForm.setValue('chargerSerialNumber', '');
  };

  // Remove device from pending list
  const removeDevice = (id: string) => {
    setPendingDevices(prev => prev.filter(d => d.id !== id));
  };

  // Submit ingestion
  const handleSubmit = async () => {
    const batchData = batchForm.getValues();

    // Filter valid devices only
    const validDevices = pendingDevices.filter(d => d.status === 'valid');

    if (validDevices.length === 0) {
      toast.error('No valid devices to ingest');
      return;
    }

    try {
      // Create batch record
      const batch = await createBatch.mutateAsync({
        receiving_warehouse: batchData.receivingWarehouse,
        supplier: batchData.supplier || null,
        date_received: format(batchData.dateReceived, 'yyyy-MM-dd'),
        purchase_order_number: batchData.purchaseOrderNumber || null,
        notes: batchData.notes || null,
        ingested_by: profile?.email || '',
        total_devices: pendingDevices.length,
        successful_count: validDevices.length,
        failed_count: pendingDevices.length - validDevices.length,
      });

      // Create device registry entries
      const deviceRecords = validDevices.map(d => ({
        serial_number: d.serialNumber,
        device_type: d.deviceType,
        item_category: d.itemCategory,
        item_nature: d.itemNature,
        item_description: d.itemDescription || null,
        status: 'Available' as const,
        current_holder_type: 'Warehouse' as const,
        current_holder_id: batchData.receivingWarehouse,
        date_acquired: format(batchData.dateReceived, 'yyyy-MM-dd'),
        warranty_expiry: d.warrantyExpiry ? format(d.warrantyExpiry, 'yyyy-MM-dd') : null,
        supplier: batchData.supplier || null,
        purchase_order_number: batchData.purchaseOrderNumber || null,
        ingestion_batch_id: batch.id,
        cradle_serial_number: d.cradleSerialNumber || null,
        charger_serial_number: d.chargerSerialNumber || null,
        created_by: profile?.email || '',
      }));

      const createdDevices = await createDevices.mutateAsync(deviceRecords);

      // Create movement records for each device
      for (const device of createdDevices) {
        await createMovement.mutateAsync({
          device_id: device.id,
          movement_type: 'Ingestion',
          movement_date: new Date().toISOString(),
          to_holder_type: 'Warehouse',
          to_holder_id: batchData.receivingWarehouse,
          performed_by: profile?.email || '',
          reference_id: batch.id,
          reference_type: 'Ingestion Batch',
          notes: `Ingested from ${batchData.supplier || 'supplier'} - PO: ${batchData.purchaseOrderNumber || 'N/A'}`,
        });
      }

      toast.success(`Successfully ingested ${validDevices.length} devices`);

      // Reset form
      setPendingDevices([]);
      batchForm.reset();
      deviceForm.reset();

    } catch (error) {
      console.error('Ingestion error:', error);
      toast.error('Failed to ingest devices');
    }
  };

  const validCount = pendingDevices.filter(d => d.status === 'valid').length;
  const errorCount = pendingDevices.filter(d => d.status !== 'valid').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Ingestion</h1>
          <p className="text-muted-foreground">Register new devices into inventory</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Information */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
            <CardDescription>Details about this stock delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Receiving Warehouse *</Label>
              <Select
                value={batchForm.watch('receivingWarehouse')}
                onValueChange={(value) => batchForm.setValue('receivingWarehouse', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                {...batchForm.register('supplier')}
                placeholder="Supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label>Date Received *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {batchForm.watch('dateReceived')
                      ? format(batchForm.watch('dateReceived'), 'PPP')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={batchForm.watch('dateReceived')}
                    onSelect={(date) => date && batchForm.setValue('dateReceived', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Purchase Order #</Label>
              <Input
                {...batchForm.register('purchaseOrderNumber')}
                placeholder="PO number"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                {...batchForm.register('notes')}
                placeholder="Additional notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Entry */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Device Entry</CardTitle>
            <CardDescription>Add devices to this batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Line *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    deviceForm.setValue('itemCategory', value);
                    setSelectedDevice('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Item Nature *</Label>
                <Select
                  value={deviceForm.watch('itemNature')}
                  onValueChange={(value) => deviceForm.setValue('itemNature', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serialised">Serialised</SelectItem>
                    <SelectItem value="Non-serialised">Non-serialised</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Device Type Selection (Gallery) */}
            {selectedCategory && (
              <div className="space-y-2">
                <Label>Device Type *</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {inventoryItems?.map((item) => (
                      <Button
                        key={item.id}
                        variant={selectedDevice === item.item_name ? 'default' : 'outline'}
                        className="h-auto py-2 flex flex-col items-center"
                        onClick={() => {
                          setSelectedDevice(item.item_name);
                          deviceForm.setValue('deviceType', item.item_name);
                        }}
                      >
                        <span className="text-xs truncate w-full text-center">
                          {item.item_name}
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Entry Mode */}
            <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="scan">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan
                </TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="bulk">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  disabled={!selectedDevice}
                  className="w-full"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Open Scanner
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Serial Number *</Label>
                  <Input
                    {...deviceForm.register('serialNumber')}
                    placeholder="Enter or paste serial"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cradle Serial</Label>
                    <Input
                      {...deviceForm.register('cradleSerialNumber')}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Charger Serial</Label>
                    <Input
                      {...deviceForm.register('chargerSerialNumber')}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <Button
                  onClick={deviceForm.handleSubmit(handleAddDevice)}
                  disabled={!selectedDevice}
                  className="w-full"
                >
                  Add to Batch
                </Button>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste Serial Numbers (one per line)</Label>
                  <textarea
                    className="w-full h-32 p-2 border rounded-md"
                    placeholder="Serial1&#10;Serial2&#10;Serial3"
                    onChange={async (e) => {
                      const serials = e.target.value.split('\n').filter(s => s.trim());
                      // Process each serial
                      for (const serial of serials) {
                        await handleScan(serial.trim());
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Pending Devices Table */}
      {pendingDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Ingestion Batch ({pendingDevices.length} devices)
            </CardTitle>
            <CardDescription>
              <span className="text-green-600">Valid: {validCount}</span>
              {errorCount > 0 && (
                <span className="text-red-600 ml-4">Errors: {errorCount}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Device Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDevices.map((device, index) => (
                    <TableRow key={device.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">{device.serialNumber}</TableCell>
                      <TableCell>{device.deviceType}</TableCell>
                      <TableCell>{device.itemCategory}</TableCell>
                      <TableCell>
                        {device.status === 'valid' ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            {device.errorMessage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDevice(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setPendingDevices([])}
              >
                Clear Batch
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validCount === 0 || createBatch.isPending}
              >
                Submit Ingestion ({validCount} devices)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

export default function StockIngestion() {
  return (
    <BackOfficeRoute>
      <StockIngestionContent />
    </BackOfficeRoute>
  );
}
```

### Asset Management Page

**File**: `src/pages/AssetManagement.tsx`

```typescript
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { DeviceRegistryTab } from '@/components/asset-management/DeviceRegistryTab';
import { InstallationsTab } from '@/components/asset-management/InstallationsTab';
import { RepairsTab } from '@/components/asset-management/RepairsTab';
import { MovementsTab } from '@/components/asset-management/MovementsTab';

import { useAuth } from '@/hooks/useAuth';
import { useDeviceStatusCounts } from '@/hooks/useAssetManagement';

export default function AssetManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'registry';
  const { isAdmin, isBackOffice } = useAuth();

  const { data: statusCounts } = useDeviceStatusCounts();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset Management</h1>
        <p className="text-muted-foreground">
          {isAdmin || isBackOffice
            ? 'Manage all devices in the system'
            : 'View and manage your assigned devices'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(statusCounts || {}).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="registry">
          <DeviceRegistryTab />
        </TabsContent>

        <TabsContent value="installations">
          <InstallationsTab />
        </TabsContent>

        <TabsContent value="repairs">
          <RepairsTab />
        </TabsContent>

        <TabsContent value="movements">
          <MovementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Validation Schemas

### File: `src/types/asset-management.ts`

```typescript
import { z } from 'zod';

// Device status enum
export const deviceStatusEnum = z.enum([
  'Available',
  'Installed',
  'Faulty',
  'In-Repair',
  'Decommissioned',
  'Unverified',
  'Missing',
]);

// Holder type enum
export const holderTypeEnum = z.enum(['Warehouse', 'Technician', 'Vendor']);

// Movement type enum
export const movementTypeEnum = z.enum([
  'Ingestion',
  'Dispatch',
  'Installation',
  'Removal',
  'Repair-In',
  'Repair-Out',
  'Transfer',
  'Return',
  'Decommission',
]);

// Fault category enum
export const faultCategoryEnum = z.enum([
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
  'Other',
]);

// Repair status enum
export const repairStatusEnum = z.enum([
  'Reported',
  'Assessing',
  'In-Repair',
  'Repaired',
  'Quality-Check',
  'Returned',
  'Decommissioned',
]);

// Installation status enum
export const installationStatusEnum = z.enum(['Active', 'Removed', 'Replaced']);

// Device Registry Schema
export const deviceRegistrySchema = z.object({
  serial_number: z.string().min(1, 'Serial number is required'),
  device_type: z.string().min(1, 'Device type is required'),
  item_category: z.string().min(1, 'Category is required'),
  item_nature: z.string().default('Serialised'),
  item_code: z.string().optional(),
  item_description: z.string().optional(),
  status: deviceStatusEnum.default('Available'),
  current_holder_type: holderTypeEnum.optional(),
  current_holder_id: z.string().optional(),
  cradle_serial_number: z.string().optional(),
  charger_serial_number: z.string().optional(),
  qr_code_serial_number: z.string().optional(),
  date_acquired: z.string().optional(),
  warranty_expiry: z.string().optional(),
  supplier: z.string().optional(),
  purchase_order_number: z.string().optional(),
  overall_condition: z.string().optional(),
});

// Vendor Schema
export const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
  vendor_type: z.string().optional(),
  business_line: z.string().optional(),
});

// Installation Schema
export const installationSchema = z.object({
  device_id: z.string().uuid('Invalid device ID'),
  vendor_id: z.string().uuid('Invalid vendor ID'),
  installed_by: z.string().min(1, 'Installer is required'),
  installation_date: z.string(),
  installation_notes: z.string().optional(),
});

// Repair Ticket Schema
export const repairTicketSchema = z.object({
  device_id: z.string().uuid('Invalid device ID'),
  reported_by: z.string().min(1, 'Reporter is required'),
  fault_category: faultCategoryEnum,
  fault_description: z.string().optional(),
  fault_severity: z.enum(['Critical', 'Major', 'Minor']).optional(),
});

// Exception types
export const exceptionTypeEnum = z.enum([
  'Missing',
  'Unregistered',
  'Mismatch',
  'Location',
]);

// Type exports
export type DeviceStatus = z.infer<typeof deviceStatusEnum>;
export type HolderType = z.infer<typeof holderTypeEnum>;
export type MovementType = z.infer<typeof movementTypeEnum>;
export type FaultCategory = z.infer<typeof faultCategoryEnum>;
export type RepairStatus = z.infer<typeof repairStatusEnum>;
export type InstallationStatus = z.infer<typeof installationStatusEnum>;
export type ExceptionType = z.infer<typeof exceptionTypeEnum>;
```

---

## Access Control

### Updated ProtectedRoute Component

Add to `src/components/ProtectedRoute.tsx`:

```typescript
// Stock Ingestion route - Back Office only
export function StockIngestionRoute({ children }: { children: React.ReactNode }) {
  const { isApproved, isAdmin, isBackOffice, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isApproved) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin && !isBackOffice) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

### Route Configuration

Add to `src/App.tsx`:

```typescript
import StockIngestion from '@/pages/StockIngestion';
import AssetManagement from '@/pages/AssetManagement';

// In routes array:
<Route path="/stock-ingestion" element={<StockIngestion />} />
<Route path="/asset-management" element={<AssetManagement />} />
```

---

## N8N Webhook Integration

### New Webhooks

Add to `src/integrations/n8n.ts`:

```typescript
// Environment variables
const DEVICE_INGESTED_WEBHOOK = import.meta.env.VITE_N8N_DEVICE_INGESTED_WEBHOOK_URL;
const DEVICE_INSTALLED_WEBHOOK = import.meta.env.VITE_N8N_DEVICE_INSTALLED_WEBHOOK_URL;
const REPAIR_CREATED_WEBHOOK = import.meta.env.VITE_N8N_REPAIR_CREATED_WEBHOOK_URL;
const DEVICE_RETURNED_WEBHOOK = import.meta.env.VITE_N8N_DEVICE_RETURNED_WEBHOOK_URL;

export const assetWebhookService = {
  async notifyDeviceIngested(payload: {
    batchId: string;
    deviceCount: number;
    warehouse: string;
    supplier?: string;
    ingestedBy: string;
  }) {
    if (!DEVICE_INGESTED_WEBHOOK) return;

    return fetch(DEVICE_INGESTED_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async notifyDeviceInstalled(payload: {
    deviceId: string;
    serialNumber: string;
    vendorName: string;
    installedBy: string;
    installationDate: string;
  }) {
    if (!DEVICE_INSTALLED_WEBHOOK) return;

    return fetch(DEVICE_INSTALLED_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async notifyRepairCreated(payload: {
    ticketNumber: number;
    deviceSerial: string;
    faultCategory: string;
    reportedBy: string;
  }) {
    if (!REPAIR_CREATED_WEBHOOK) return;

    return fetch(REPAIR_CREATED_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async notifyDeviceReturned(payload: {
    deviceId: string;
    serialNumber: string;
    returnedToWarehouse: string;
    repairTicketId: string;
  }) {
    if (!DEVICE_RETURNED_WEBHOOK) return;

    return fetch(DEVICE_RETURNED_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
```

---

## Environment Variables

Add to `.env`:

```bash
# Asset Management Webhooks
VITE_N8N_DEVICE_INGESTED_WEBHOOK_URL=
VITE_N8N_DEVICE_INSTALLED_WEBHOOK_URL=
VITE_N8N_REPAIR_CREATED_WEBHOOK_URL=
VITE_N8N_DEVICE_RETURNED_WEBHOOK_URL=
```

---

## Summary

### Files to Create

1. `scripts/create-asset-management-tables.sql` - Database migration
2. `src/integrations/supabase/services-asset.ts` - Supabase services
3. `src/hooks/useAssetManagement.ts` - React Query hooks
4. `src/pages/StockIngestion.tsx` - Stock ingestion page
5. `src/pages/AssetManagement.tsx` - Asset management page with tabs
6. `src/types/asset-management.ts` - TypeScript types and Zod schemas
7. `src/components/asset-management/` - Tab components (Registry, Installations, Repairs, Movements)

### Files to Modify

1. `src/App.tsx` - Add routes
2. `src/components/ProtectedRoute.tsx` - Add StockIngestionRoute
3. `src/integrations/n8n.ts` - Add asset webhooks
4. `.env` - Add webhook URLs

### Implementation Order

1. Run database migration
2. Create Supabase services
3. Create React Query hooks
4. Create type definitions
5. Create Stock Ingestion page
6. Create Asset Management page with tabs
7. Update routing and access control
8. Add N8N webhook integration
9. Test end-to-end workflows

---

*Technical Specification Version: 1.0*
*Created: November 2024*
