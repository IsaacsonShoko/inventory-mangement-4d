/**
 * Supabase Services for Orders System
 * Replaces Airtable services for inventory catalog, orders, picking, and dispatch
 */

import { supabase } from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Enum types matching database
export type DeliveryPartyEnum = 'Technician' | 'Regional Warehouse' | 'Non Technician';
export type ItemNatureEnum = 'Serialised' | 'Non-serialised';
export type ItemCategoryEnum = 'Accessories' | 'Absa' | 'Cash Connect' | 'Modems' | 'Sim Management' | 'VPS' | 'Other';
export type DispatchStatusEnum = 'Pending' | 'Partially Dispatched' | 'Dispatched' | 'Cancelled';
export type PickStatusEnum = 'Not Picked' | 'Partially Picked' | 'Picked';
export type StockAvailabilityEnum = 'In Stock' | 'Out of Stock' | 'Partial';
export type DispatchMethodEnum = 'Courier' | 'Collection' | 'Internal Transfer';

// Database row types
export interface InventoryCatalogRow {
  id: string;
  item_name: string; // Schema uses item_name, not device_type
  item_description: string | null;
  item_category: ItemCategoryEnum;
  item_nature: ItemNatureEnum;
  item_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointOfPresenceRow {
  id: string;
  name_surname: string;
  contractor: string;
  region: string;
  email_address: string | null;
  area_based: string | null;
  location_code: string | null;
  contact_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_number: number;
  date_ordered: string;
  item_category: ItemCategoryEnum;
  item_nature: ItemNatureEnum;
  delivery_party: DeliveryPartyEnum;
  contractor_company: string | null;
  region: string | null;
  technician: string | null;
  pop_id: string | null;
  recipient_name: string | null;
  recipient_company_name: string | null;
  recipient_address: string | null;
  recipient_contact_number: string | null;
  recipient_email: string | null;
  ordered_by: string;
  on_behalf_of: string | null;
  order_location: string | null;
  cellphone_number: string | null;
  quantity_ordered: number;
  dispatch_status: DispatchStatusEnum;
  pick_status: PickStatusEnum | null;
  stock_availability: StockAvailabilityEnum | null;
  dispatch_method: DispatchMethodEnum | null;
  waybill_number: string | null;
  warehouse_fulfilling: string | null;
  order_notes: string | null;
  order_summary_ai: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderLineItemRow {
  id: string;
  order_id: string;
  inventory_item_id: string | null;
  device_type: string;
  item_description: string | null;
  item_category: ItemCategoryEnum | null;
  item_nature: ItemNatureEnum | null;
  item_url: string | null;
  quantity_ordered: number;
  quantity_dispatched: number;
  pick_status: PickStatusEnum;
  stock_availability: StockAvailabilityEnum | null;
  terminal_serial_number: string | null;
  cradle_serial_number: string | null;
  charger_serial_number: string | null;
  cashconnect_serial_number: string | null;
  charger_packed: string | null;
  cables: string | null;
  packer: string | null;
  package_reference: string | null;
  item_code: string | null;
  dispatch_method: DispatchMethodEnum | null;
  warehouse_fulfilling: string | null;
  waybill_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchLogRow {
  id: string;
  order_id: string | null;
  order_line_item_id: string | null;
  date_dispatched: string;
  dispatcher: string | null;
  dispatch_to_location: string | null;
  item_category: ItemCategoryEnum | null;
  item_nature: ItemNatureEnum | null;
  item_description: string | null;
  device_type: string | null;
  quantity: number;
  contractor_company: string | null;
  region: string | null;
  technician: string | null;
  dispatch_method: DispatchMethodEnum | null;
  waybill_number: string | null;
  package_reference: string | null;
  warehouse_fulfilling: string | null;
  shipped: boolean;
  terminal_serial_number: string | null;
  cradle_serial_number: string | null;
  charger_serial_number: string | null;
  cashconnect_serial_number: string | null;
  charger_packed: string | null;
  cables: string | null;
  packer: string | null;
  item_code: string | null;
  time_picked: string | null;
  time_dispatched: string | null;
  created_at: string;
}

// Input types for creating/updating
export interface CreateOrderInput {
  date_ordered?: string;
  item_category: ItemCategoryEnum;
  item_nature: ItemNatureEnum;
  delivery_party: DeliveryPartyEnum;
  contractor_company?: string;
  region?: string;
  technician?: string;
  pop_id?: string;
  recipient_name?: string;
  recipient_company_name?: string;
  recipient_address?: string;
  recipient_contact_number?: string;
  recipient_email?: string;
  ordered_by: string;
  on_behalf_of?: string;
  order_location?: string;
  cellphone_number?: string;
}

export interface CreateOrderLineItemInput {
  order_id: string;
  inventory_item_id?: string;
  device_type: string;
  item_description?: string;
  item_category?: ItemCategoryEnum;
  item_nature?: ItemNatureEnum;
  item_url?: string;
  quantity_ordered: number;
}

export interface CartItem {
  id: string;
  itemName: string;
  itemDescription: string;
  itemCategory: string;
  quantity: number;
  itemNature: string;
  itemUrl?: string;
}

// ============================================================================
// INVENTORY CATALOG SERVICE
// ============================================================================

export const inventoryCatalogService = {
  async getAll(filters?: {
    category?: ItemCategoryEnum;
    nature?: ItemNatureEnum;
    search?: string;
  }): Promise<InventoryCatalogRow[]> {
    let query = supabase
      .from('inventory_items')
      .select('*')
      .order('item_name', { ascending: true });

    if (filters?.category) {
      query = query.eq('item_category', filters.category);
    }

    if (filters?.nature) {
      query = query.eq('item_nature', filters.nature);
    }

    if (filters?.search) {
      query = query.or(`item_name.ilike.%${filters.search}%,item_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getCategories(): Promise<ItemCategoryEnum[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('item_category');

    if (error) throw error;

    const categories = [...new Set(data?.map(d => d.item_category) || [])];

    // Sort by predefined order
    const sortOrder: ItemCategoryEnum[] = ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];
    return categories.sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));
  },

  async getNaturesByCategory(category?: ItemCategoryEnum): Promise<ItemNatureEnum[]> {
    let query = supabase
      .from('inventory_items')
      .select('item_nature');

    if (category) {
      query = query.eq('item_category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    const natures = [...new Set(data?.map(d => d.item_nature) || [])];
    const sortOrder: ItemNatureEnum[] = ['Serialised', 'Non-serialised'];
    return natures.sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));
  },

  async getById(id: string): Promise<InventoryCatalogRow | null> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};

// ============================================================================
// POINT OF PRESENCE SERVICE
// ============================================================================

export const pointOfPresenceService = {
  async getAll(): Promise<PointOfPresenceRow[]> {
    const { data, error } = await supabase
      .from('point_of_presence')
      .select('*')
      .order('name_surname', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getContractors(): Promise<string[]> {
    const { data, error } = await supabase
      .from('point_of_presence')
      .select('contractor');

    if (error) throw error;

    const contractors = [...new Set(data?.map(d => d.contractor).filter(Boolean) || [])];
    return contractors.sort();
  },

  async getRegions(contractor?: string): Promise<string[]> {
    let query = supabase
      .from('point_of_presence')
      .select('region');

    if (contractor) {
      query = query.eq('contractor', contractor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const regions = [...new Set(data?.map(d => d.region).filter(Boolean) || [])];
    return regions.sort();
  },

  async getTechnicians(contractor?: string, region?: string): Promise<PointOfPresenceRow[]> {
    let query = supabase
      .from('point_of_presence')
      .select('*')
      .order('name_surname', { ascending: true });

    if (contractor) {
      query = query.eq('contractor', contractor);
    }

    if (region) {
      query = query.eq('region', region);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getByName(name: string): Promise<PointOfPresenceRow | null> {
    const { data, error } = await supabase
      .from('point_of_presence')
      .select('*')
      .eq('name_surname', name)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getById(id: string): Promise<PointOfPresenceRow | null> {
    const { data, error } = await supabase
      .from('point_of_presence')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};

// ============================================================================
// ORDERS SERVICE
// ============================================================================

export const ordersService = {
  async create(input: CreateOrderInput, cartItems: CartItem[]): Promise<{ orderId: string; orderNumber: number }> {
    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('unique_orders')
      .insert({
        date_ordered: input.date_ordered || new Date().toISOString().split('T')[0],
        item_category: input.item_category,
        item_nature: input.item_nature,
        delivery_party: input.delivery_party,
        contractor_company: input.contractor_company || null,
        region: input.region || null,
        technician: input.technician || null,
        pop_id: input.pop_id || null,
        recipient_name: input.recipient_name || null,
        recipient_company_name: input.recipient_company_name || null,
        recipient_address: input.recipient_address || null,
        recipient_contact_number: input.recipient_contact_number || null,
        recipient_email: input.recipient_email || null,
        ordered_by: input.ordered_by,
        on_behalf_of: input.on_behalf_of || null,
        order_location: input.order_location || null,
        cellphone_number: input.cellphone_number || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create line items
    const lineItems: CreateOrderLineItemInput[] = cartItems.map(item => ({
      order_id: order.id,
      inventory_item_id: item.id || undefined,
      device_type: item.itemName,
      item_description: item.itemDescription,
      item_category: item.itemCategory as ItemCategoryEnum,
      item_nature: item.itemNature as ItemNatureEnum,
      item_url: item.itemUrl,
      quantity_ordered: item.quantity,
    }));

    const { error: lineItemsError } = await supabase
      .from('order_line_items')
      .insert(lineItems);

    if (lineItemsError) throw lineItemsError;

    return {
      orderId: order.id,
      orderNumber: order.order_number,
    };
  },

  async getAll(filters?: {
    pickStatus?: PickStatusEnum[];
    dispatchStatus?: DispatchStatusEnum[];
    category?: ItemCategoryEnum[];
    search?: string;
  }): Promise<OrderRow[]> {
    let query = supabase
      .from('unique_orders')
      .select('*')
      .order('date_ordered', { ascending: false });

    if (filters?.pickStatus?.length) {
      query = query.in('pick_status', filters.pickStatus);
    }

    if (filters?.dispatchStatus?.length) {
      query = query.in('dispatch_status', filters.dispatchStatus);
    }

    if (filters?.category?.length) {
      query = query.in('item_category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`
        recipient_name.ilike.%${filters.search}%,
        recipient_company_name.ilike.%${filters.search}%,
        order_location.ilike.%${filters.search}%,
        waybill_number.ilike.%${filters.search}%,
        order_notes.ilike.%${filters.search}%
      `);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<OrderRow | null> {
    const { data, error } = await supabase
      .from('unique_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByOrderNumber(orderNumber: number): Promise<OrderRow | null> {
    const { data, error } = await supabase
      .from('unique_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(id: string, updates: Partial<OrderRow>): Promise<OrderRow> {
    const { data, error } = await supabase
      .from('unique_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLineItems(orderId: string): Promise<OrderLineItemRow[]> {
    const { data, error } = await supabase
      .from('order_line_items')
      .select('*')
      .eq('order_id', orderId)
      .order('device_type', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateLineItem(id: string, updates: Partial<OrderLineItemRow>): Promise<OrderLineItemRow> {
    const { data, error } = await supabase
      .from('order_line_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPickingQueue(): Promise<OrderRow[]> {
    const { data, error } = await supabase
      .from('unique_orders')
      .select('*')
      .or('pick_status.is.null,pick_status.eq.Not Picked,pick_status.eq.Partially Picked')
      .order('date_ordered', { ascending: true })
      .order('item_category', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getDispatchQueue(): Promise<OrderRow[]> {
    const { data, error } = await supabase
      .from('unique_orders')
      .select('*')
      .eq('pick_status', 'Picked')
      .or('dispatch_status.is.null,dispatch_status.eq.Pending,dispatch_status.eq.Partially Dispatched')
      .order('date_ordered', { ascending: true })
      .order('item_category', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// DISPATCH LOG SERVICE
// ============================================================================

export const dispatchLogService = {
  async create(input: Omit<DispatchLogRow, 'id' | 'created_at'>): Promise<DispatchLogRow> {
    const { data, error } = await supabase
      .from('dispatch_log')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByOrderId(orderId: string): Promise<DispatchLogRow[]> {
    const { data, error } = await supabase
      .from('dispatch_log')
      .select('*')
      .eq('order_id', orderId)
      .order('date_dispatched', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: Partial<DispatchLogRow>): Promise<DispatchLogRow> {
    const { data, error } = await supabase
      .from('dispatch_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRecent(limit: number = 50): Promise<DispatchLogRow[]> {
    const { data, error } = await supabase
      .from('dispatch_log')
      .select('*')
      .order('date_dispatched', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatOrderNumber = (num: number): string => {
  return `ORD-${String(num).padStart(4, '0')}`;
};

export const parseOrderNumber = (formatted: string): number | null => {
  const match = formatted.match(/ORD-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};
