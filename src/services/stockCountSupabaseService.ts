import { supabase } from '@/integrations/supabase/client';
import { StockItem, StockCountFormData, CountType } from '@/types/stock';

// Supabase row types
interface StockLevelRow {
  id: string;
  device_type: string;
  item_description: string | null;
  item_category: string | null;
  item_nature: string | null;
  item_code: string | null;
  bin_location: string | null;
  quantity: number;
  manufacture_serial_number: string | null;
  qr_code_serial_number: string | null;
  xlink_serial_number: string | null;
  cradle_serial_number: string | null;
  charger_serial_number: string | null;
  stock_holder: string | null;
  name_or_location: string | null;
  contractor_company: string | null;
  contractor_region: string | null;
  technician_name: string | null;
  tech_id: string | null;
  item_status: string | null;
  fault_reason: string | null;
  overall_condition: string | null;
  xli_case_ref: string | null;
  count_type: string | null;
  count_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Transform Supabase row to StockItem
function transformToStockItem(row: StockLevelRow): StockItem {
  return {
    id: row.id,
    deviceType: row.device_type,
    itemDescription: row.item_description || '',
    itemCategory: row.item_category || '',
    itemNature: (row.item_nature as 'Serialised' | 'Non-serialised') || 'Non-serialised',
    itemCode: row.item_code || '',
    binLocation: row.bin_location || '',
    quantity: row.quantity || 0,
    manufactureSerialNumber: row.manufacture_serial_number || undefined,
    qrCodeSerialNumber: row.qr_code_serial_number || undefined,
    xlinkSerialNumber: row.xlink_serial_number || undefined,
    cradleSerialNumber: row.cradle_serial_number || undefined,
    chargerSerialNumber: row.charger_serial_number || undefined,
    stockHolder: row.stock_holder || '',
    nameOrLocation: row.name_or_location || '',
    contractorCompany: row.contractor_company || '',
    contractorRegion: row.contractor_region || '',
    technicianName: row.technician_name || '',
    techId: row.tech_id || '',
    itemStatus: row.item_status || '',
    faultReason: row.fault_reason || undefined,
    overallCondition: row.overall_condition || undefined,
    xliCaseRef: row.xli_case_ref || undefined,
    countType: (row.count_type as CountType) || 'Monthly',
    countId: row.count_id || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export const stockCountSupabaseService = {
  // Fetch stock items with optional filters
  async getStockItems(filters: {
    searchTerm?: string;
    itemCategory?: string;
    isSerialized?: boolean;
  } = {}): Promise<StockItem[]> {
    const { searchTerm, itemCategory, isSerialized } = filters;

    let query = supabase
      .from('stock_levels')
      .select('*')
      .order('device_type', { ascending: true });

    if (itemCategory) {
      query = query.eq('item_category', itemCategory);
    }

    if (isSerialized !== undefined) {
      query = query.eq('item_nature', isSerialized ? 'Serialised' : 'Non-serialised');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock items:', error);
      throw error;
    }

    let items = (data || []).map(transformToStockItem);

    // Apply search filter in-memory (for better UX with partial matches)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.deviceType.toLowerCase().includes(term) ||
        item.itemDescription.toLowerCase().includes(term)
      );
    }

    return items;
  },

  // Create a new stock count
  async createStockCount(data: StockCountFormData): Promise<StockItem> {
    const { data: inserted, error } = await supabase
      .from('stock_counts')
      .insert({
        count_type: data.countType,
        stock_holder: data.stockHolder,
        name_or_location: data.nameOrLocation,
        item_category: data.itemCategory,
        bin_location: data.binLocation,
        device_type: data.deviceType,
        item_nature: data.itemNature,
        item_code: data.itemCode,
        item_description: data.itemDescription,
        quantity: data.quantity,
        manufacture_serial_number: data.manufactureSerialNumber,
        qr_code_serial_number: data.qrCodeSerialNumber,
        xlink_serial_number: data.xlinkSerialNumber,
        cradle_serial_number: data.cradleSerialNumber,
        charger_serial_number: data.chargerSerialNumber,
        item_status: data.itemStatus,
        fault_reason: data.faultReason,
        overall_condition: data.overallCondition,
        xli_case_ref: data.xliCaseRef,
        contractor_company: data.contractorCompany,
        contractor_region: data.contractorRegion,
        technician_name: data.technicianName,
        tech_id: data.techId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating stock count:', error);
      throw error;
    }

    return transformToStockItem(inserted as StockLevelRow);
  },

  // Update an existing stock count
  async updateStockCount(id: string, data: Partial<StockCountFormData>): Promise<StockItem> {
    const updateData: Record<string, unknown> = {};

    if (data.countType) updateData.count_type = data.countType;
    if (data.stockHolder) updateData.stock_holder = data.stockHolder;
    if (data.nameOrLocation) updateData.name_or_location = data.nameOrLocation;
    if (data.itemCategory) updateData.item_category = data.itemCategory;
    if (data.binLocation) updateData.bin_location = data.binLocation;
    if (data.deviceType) updateData.device_type = data.deviceType;
    if (data.itemNature) updateData.item_nature = data.itemNature;
    if (data.itemCode) updateData.item_code = data.itemCode;
    if (data.itemDescription) updateData.item_description = data.itemDescription;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.manufactureSerialNumber !== undefined) updateData.manufacture_serial_number = data.manufactureSerialNumber;
    if (data.qrCodeSerialNumber !== undefined) updateData.qr_code_serial_number = data.qrCodeSerialNumber;
    if (data.xlinkSerialNumber !== undefined) updateData.xlink_serial_number = data.xlinkSerialNumber;
    if (data.cradleSerialNumber !== undefined) updateData.cradle_serial_number = data.cradleSerialNumber;
    if (data.chargerSerialNumber !== undefined) updateData.charger_serial_number = data.chargerSerialNumber;
    if (data.itemStatus) updateData.item_status = data.itemStatus;
    if (data.faultReason !== undefined) updateData.fault_reason = data.faultReason;
    if (data.overallCondition !== undefined) updateData.overall_condition = data.overallCondition;
    if (data.xliCaseRef !== undefined) updateData.xli_case_ref = data.xliCaseRef;
    if (data.contractorCompany) updateData.contractor_company = data.contractorCompany;
    if (data.contractorRegion) updateData.contractor_region = data.contractorRegion;
    if (data.technicianName) updateData.technician_name = data.technicianName;
    if (data.techId) updateData.tech_id = data.techId;

    const { data: updated, error } = await supabase
      .from('stock_counts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stock count:', error);
      throw error;
    }

    return transformToStockItem(updated as StockLevelRow);
  },

  // Get stock count by ID
  async getStockCount(id: string): Promise<StockItem | null> {
    const { data, error } = await supabase
      .from('stock_counts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching stock count:', error);
      throw error;
    }

    return transformToStockItem(data as StockLevelRow);
  },

  // Get all stock counts (for reports)
  async getAllStockCounts(): Promise<StockItem[]> {
    const { data, error } = await supabase
      .from('stock_counts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock counts:', error);
      throw error;
    }

    return (data || []).map(row => transformToStockItem(row as StockLevelRow));
  },
};
