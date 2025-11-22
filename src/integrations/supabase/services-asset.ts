import { supabase } from './client';

// ======================
// TYPE DEFINITIONS
// ======================

// Device status enum values
export type DeviceStatusEnum =
  | 'Available'
  | 'Installed'
  | 'Faulty'
  | 'In-Repair'
  | 'Decommissioned'
  | 'Unverified'
  | 'Missing';

// Holder type enum values
export type HolderTypeEnum = 'Warehouse' | 'Technician' | 'Vendor';

// Movement type enum values
export type MovementTypeEnum =
  | 'Ingestion'
  | 'Dispatch'
  | 'Installation'
  | 'Removal'
  | 'Repair-In'
  | 'Repair-Out'
  | 'Transfer'
  | 'Return'
  | 'Decommission';

// Fault category enum values
export type FaultCategoryEnum =
  | 'Dead On Arrival'
  | 'Screen Damaged'
  | 'Cradle/Charger Damaged'
  | 'Enclosure Damaged'
  | 'Port/Connector Damaged'
  | 'Battery Failure'
  | 'Printer Malfunction'
  | 'Card Reader Failure'
  | 'Keypad Malfunction'
  | 'Speaker/Mic Failure'
  | 'Software Error'
  | 'Connectivity Issues'
  | 'Firmware Corruption'
  | 'SIM/Network Failure'
  | 'Water Damage'
  | 'Heat Damage'
  | 'Theft/Tampering'
  | 'Unknown'
  | 'Other';

// Repair status enum values
export type RepairStatusEnum =
  | 'Reported'
  | 'Assessing'
  | 'In-Repair'
  | 'Repaired'
  | 'Quality-Check'
  | 'Returned'
  | 'Decommissioned';

// Device Registry types
export interface DeviceRegistry {
  id: string;
  serial_number: string;
  device_type: string;
  item_category: string;
  item_nature: string;
  item_code: string | null;
  item_description: string | null;
  status: DeviceStatusEnum;
  current_holder_type: HolderTypeEnum | null;
  current_holder_id: string | null;
  cradle_serial_number: string | null;
  charger_serial_number: string | null;
  qr_code_serial_number: string | null;
  date_acquired: string | null;
  warranty_expiry: string | null;
  last_verified_date: string | null;
  last_maintenance_date: string | null;
  supplier: string | null;
  purchase_order_number: string | null;
  ingestion_batch_id: string | null;
  overall_condition: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DeviceRegistryInsert {
  serial_number: string;
  device_type: string;
  item_category: string;
  item_nature?: string;
  item_code?: string | null;
  item_description?: string | null;
  status?: DeviceStatusEnum;
  current_holder_type?: HolderTypeEnum | null;
  current_holder_id?: string | null;
  cradle_serial_number?: string | null;
  charger_serial_number?: string | null;
  qr_code_serial_number?: string | null;
  date_acquired?: string | null;
  warranty_expiry?: string | null;
  supplier?: string | null;
  purchase_order_number?: string | null;
  ingestion_batch_id?: string | null;
  overall_condition?: string | null;
  created_by?: string | null;
}

// Repair Ticket types
export interface RepairTicket {
  id: string;
  ticket_number: number;
  device_id: string;
  reported_by: string;
  reported_date: string;
  fault_category: FaultCategoryEnum;
  fault_description: string | null;
  fault_severity: string | null;
  fault_images: string[] | null;
  assessed_by: string | null;
  assessment_date: string | null;
  assessment_notes: string | null;
  is_repairable: boolean | null;
  estimated_repair_hours: number | null;
  repaired_by: string | null;
  repair_start_date: string | null;
  repair_end_date: string | null;
  repair_actions: string | null;
  parts_used: string | null;
  repair_cost: number | null;
  quality_checked_by: string | null;
  quality_check_date: string | null;
  quality_check_passed: boolean | null;
  quality_check_notes: string | null;
  status: RepairStatusEnum;
  returned_to_stock_date: string | null;
  returned_to_warehouse: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepairTicketInsert {
  device_id: string;
  reported_by: string;
  fault_category: FaultCategoryEnum;
  fault_description?: string | null;
  fault_severity?: string | null;
  fault_images?: string[] | null;
  status?: RepairStatusEnum;
}

// Device Movement types
export interface DeviceMovement {
  id: string;
  device_id: string;
  movement_type: MovementTypeEnum;
  movement_date: string;
  from_holder_type: HolderTypeEnum | null;
  from_holder_id: string | null;
  to_holder_type: HolderTypeEnum | null;
  to_holder_id: string | null;
  performed_by: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface DeviceMovementInsert {
  device_id: string;
  movement_type: MovementTypeEnum;
  movement_date?: string;
  from_holder_type?: HolderTypeEnum | null;
  from_holder_id?: string | null;
  to_holder_type?: HolderTypeEnum | null;
  to_holder_id?: string | null;
  performed_by: string;
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
}

// Ingestion Batch types
export interface IngestionBatch {
  id: string;
  batch_number: number;
  receiving_warehouse: string;
  supplier: string | null;
  date_received: string;
  purchase_order_number: string | null;
  notes: string | null;
  total_devices: number;
  successful_count: number;
  failed_count: number;
  ingested_by: string;
  created_at: string;
}

export interface IngestionBatchInsert {
  receiving_warehouse: string;
  supplier?: string | null;
  date_received: string;
  purchase_order_number?: string | null;
  notes?: string | null;
  total_devices?: number;
  successful_count?: number;
  failed_count?: number;
  ingested_by: string;
}

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
    return data as DeviceRegistry[];
  },

  // Get single device by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as DeviceRegistry;
  },

  // Get device by serial number
  async getBySerial(serialNumber: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('serial_number', serialNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as DeviceRegistry | null;
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
    return data as DeviceRegistry;
  },

  // Bulk create devices
  async createBulk(devices: DeviceRegistryInsert[]) {
    const { data, error } = await supabase
      .from('device_registry')
      .insert(devices)
      .select();

    if (error) throw error;
    return data as DeviceRegistry[];
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
    return data as DeviceRegistry;
  },

  // Update device status
  async updateStatus(
    id: string,
    status: DeviceStatusEnum,
    holderType?: HolderTypeEnum,
    holderId?: string
  ) {
    const updates: Partial<DeviceRegistry> = { status };
    if (holderType) updates.current_holder_type = holderType;
    if (holderId) updates.current_holder_id = holderId;

    return this.update(id, updates);
  },

  // Get device counts by status
  async getStatusCounts() {
    const { data, error } = await supabase
      .from('device_registry')
      .select('status');

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  },

  // Get devices for technician
  async getByTechnician(techId: string) {
    const { data, error } = await supabase
      .from('device_registry')
      .select('*')
      .eq('current_holder_id', techId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as DeviceRegistry[];
  },

  // Get unique device types
  async getDeviceTypes() {
    const { data, error } = await supabase
      .from('device_registry')
      .select('device_type')
      .not('device_type', 'is', null);

    if (error) throw error;

    const types = new Set<string>();
    data?.forEach((d) => {
      if (d.device_type) types.add(d.device_type);
    });
    return Array.from(types).sort();
  },

  // Get unique categories
  async getCategories() {
    const { data, error } = await supabase
      .from('device_registry')
      .select('item_category')
      .not('item_category', 'is', null);

    if (error) throw error;

    const categories = new Set<string>();
    data?.forEach((d) => {
      if (d.item_category) categories.add(d.item_category);
    });
    return Array.from(categories).sort();
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
    return data as RepairTicket[];
  },

  async create(ticket: RepairTicketInsert) {
    const { data, error } = await supabase
      .from('repair_tickets')
      .insert(ticket)
      .select()
      .single();

    if (error) throw error;
    return data as RepairTicket;
  },

  async updateStatus(id: string, status: RepairStatusEnum, additionalData?: Partial<RepairTicket>) {
    const updates: Partial<RepairTicket> = {
      status,
      ...additionalData,
    };

    const { data, error } = await supabase
      .from('repair_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RepairTicket;
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
    return data as DeviceMovement[];
  },

  async create(movement: DeviceMovementInsert) {
    const { data, error } = await supabase
      .from('device_movements')
      .insert(movement)
      .select()
      .single();

    if (error) throw error;
    return data as DeviceMovement;
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
  async create(batch: IngestionBatchInsert) {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .insert(batch)
      .select()
      .single();

    if (error) throw error;
    return data as IngestionBatch;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as IngestionBatch[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('ingestion_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as IngestionBatch;
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
    return data as IngestionBatch;
  },
};
