import { supabase } from './client';
import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './types';
import {
  n8nService,
  type OrderFormDataSnapshot,
  type CartItemSnapshot,
  type OrderLineWebhookPayload,
} from '@/integrations/n8n';

// Type aliases for convenience
export type InventoryItem = Tables<'inventory_items'>;
export type PointOfPresence = Tables<'point_of_presence'>;
export type UniqueOrder = Tables<'unique_orders'>;
export type StockOrder = Tables<'stock_order'>;
export type DispatchLog = Tables<'dispatch_log'>;

// Insert types
export type UniqueOrderInsert = TablesInsert<'unique_orders'>;
export type StockOrderInsert = TablesInsert<'stock_order'>;
export type DispatchLogInsert = TablesInsert<'dispatch_log'>;

// Update types
export type UniqueOrderUpdate = TablesUpdate<'unique_orders'>;
export type StockOrderUpdate = TablesUpdate<'stock_order'>;
export type DispatchLogUpdate = TablesUpdate<'dispatch_log'>;

// Enum types
export type BusinessLineEnum = Enums<'business_line_enum'>;
export type ItemNatureEnum = Enums<'item_nature_enum'>;
export type PickStatusEnum = Enums<'pick_status_enum'>;
export type DispatchStatusEnum = Enums<'dispatch_status_enum'>;
export type DispatchMethodEnum = Enums<'dispatch_method_enum'>;
export type DeliveryPartyEnum = Enums<'delivery_party_enum'>;

// Form data types (for UI)
export interface OrderFormData {
  dateOrdered: Date;
  itemCategory: BusinessLineEnum;
  itemNature: ItemNatureEnum;
  deliveryParty: DeliveryPartyEnum | '';
  contractorCompany?: string;
  region?: string;
  technician?: string;
  recipientName?: string;
  recipientCompanyName?: string;
  recipientAddress?: string;
  recipientContactNumber?: string;
  recipientEmail?: string;
  orderedBy: string;
  orderLocation?: string;
  popId?: string;
  cellPhoneNumber?: string;
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

export interface DispatchQueueOrder extends UniqueOrder {
  dispatchLogEntries: DispatchLog[];
}

// Error formatting
const formatSupabaseError = (error: unknown, context: string) => {
  const baseMessage = `Supabase ${context} failed`;

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(`${baseMessage}: ${(error as { message: string }).message}`);
  }

  return new Error(`${baseMessage}: Unexpected error`);
};

// Utility functions
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CATEGORY_SORT_ORDER: BusinessLineEnum[] = ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];
const NATURE_SORT_ORDER: ItemNatureEnum[] = ['Serialised', 'Non-serialised'];

const sortCategories = (categories: string[]) => {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_SORT_ORDER.indexOf(a as BusinessLineEnum);
    const indexB = CATEGORY_SORT_ORDER.indexOf(b as BusinessLineEnum);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

const sortNatures = (natures: string[]) => {
  return natures.sort((a, b) => {
    const indexA = NATURE_SORT_ORDER.indexOf(a as ItemNatureEnum);
    const indexB = NATURE_SORT_ORDER.indexOf(b as ItemNatureEnum);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

const formatOrderNumber = (orderNumber: number): string => {
  return `ORD-${String(orderNumber).padStart(4, '0')}`;
};

// Stock availability utilities
const normalizeStockAvailabilityValue = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const lower = value.toLowerCase().trim();

  // Map UI values to database values
  if (lower === 'in stock') return 'Available';
  if (lower === 'out of stock') return 'Not Available';
  if (lower === 'available') return 'Available';
  if (lower === 'not available') return 'Not Available';
  if (lower === 'backordered') return 'Backordered';
  if (lower === 'partial') return 'Partial';

  return undefined;
};

// Pick status utilities
const normalizePickStatusValue = (value?: string | null): PickStatusEnum | undefined => {
  if (!value) return undefined;

  const lower = value.toLowerCase().trim();

  if (lower === 'not picked') return 'Not Picked';
  if (lower === 'partially picked') return 'Partially Picked';
  if (lower === 'picked in full' || lower === 'picked') return 'Picked';
  if (lower === 'pending') return 'Pending';

  return undefined;
};

const pickStatusPriority = (value?: string | null): number => {
  const normalized = normalizePickStatusValue(value);

  switch (normalized) {
    case 'Not Picked': return 3;
    case 'Partially Picked': return 2;
    case 'Picked': return 1;
    case 'Pending': return 0;
    default: return 0;
  }
};

// ============================================
// INVENTORY SERVICE
// ============================================
export const inventoryService = {
  async getAll(filters?: { category?: string; serialized?: string }): Promise<InventoryItem[]> {
    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('item_name', { ascending: true });

      if (filters?.category) {
        query = query.eq('item_category', filters.category);
      }

      if (filters?.serialized) {
        query = query.eq('item_nature', filters.serialized);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw formatSupabaseError(error, 'inventory fetch');
    }
  },

  async search(query: string, filters?: { category?: string; serialized?: string }): Promise<InventoryItem[]> {
    const items = await this.getAll(filters);

    if (!query) return items;

    const searchLower = query.toLowerCase();
    return items.filter(item =>
      item.item_name?.toLowerCase().includes(searchLower) ||
      item.item_description?.toLowerCase().includes(searchLower)
    );
  },

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('item_category')
        .not('item_category', 'is', null);

      if (error) throw error;

      const categories = new Set<string>();
      data?.forEach(record => {
        if (record.item_category) {
          categories.add(record.item_category);
        }
      });

      return sortCategories(Array.from(categories));
    } catch (error) {
      console.error('Error fetching inventory categories:', error);
      throw formatSupabaseError(error, 'inventory categories fetch');
    }
  },

  async getNaturesByCategory(category?: string): Promise<string[]> {
    try {
      let query = supabase
        .from('inventory_items')
        .select('item_nature')
        .not('item_nature', 'is', null);

      if (category) {
        query = query.eq('item_category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      const natures = new Set<string>();
      data?.forEach(record => {
        if (record.item_nature) {
          natures.add(record.item_nature);
        }
      });

      return sortNatures(Array.from(natures));
    } catch (error) {
      console.error('Error fetching inventory natures:', error);
      throw formatSupabaseError(error, 'inventory natures fetch');
    }
  }
};

// ============================================
// POINT OF PRESENCE SERVICE
// ============================================
export const popService = {
  async getAll(): Promise<PointOfPresence[]> {
    try {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('*')
        .order('name_surname', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Point of Presence:', error);
      throw formatSupabaseError(error, 'Point of Presence fetch');
    }
  },

  async getContractors(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('contractor')
        .not('contractor', 'is', null);

      if (error) throw error;

      const contractors = [...new Set(data?.map(r => r.contractor).filter(Boolean))] as string[];
      return contractors.sort();
    } catch (error) {
      console.error('Error fetching contractors:', error);
      throw formatSupabaseError(error, 'contractors fetch');
    }
  },

  async getRegions(contractor?: string): Promise<string[]> {
    try {
      let query = supabase
        .from('point_of_presence')
        .select('region')
        .not('region', 'is', null);

      if (contractor) {
        query = query.eq('contractor', contractor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const regions = [...new Set(data?.map(r => r.region).filter(Boolean))] as string[];
      return regions.sort();
    } catch (error) {
      console.error('Error fetching regions:', error);
      throw formatSupabaseError(error, 'regions fetch');
    }
  },

  async getTechnicians(contractor?: string, region?: string): Promise<PointOfPresence[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching technicians:', error);
      throw formatSupabaseError(error, 'technicians fetch');
    }
  },

  async getByName(name: string): Promise<PointOfPresence | null> {
    try {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('*')
        .eq('name_surname', name)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching technician by name:', error);
      throw formatSupabaseError(error, 'technician lookup');
    }
  }
};

// ============================================
// ORDER SERVICE
// ============================================
export const orderService = {
  async create(formData: OrderFormData, cartItems: CartItem[]): Promise<{ orderId: string; orderRecordIds: number[] }> {
    try {
      const isoDateOrdered = formData.dateOrdered.toISOString();
      const formattedDateOrdered = isoDateOrdered.split('T')[0];

      // Calculate total quantity
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create unique order record
      const uniqueOrderData: UniqueOrderInsert = {
        date_ordered: isoDateOrdered,
        item_category: formData.itemCategory as BusinessLineEnum,
        item_nature: formData.itemNature as ItemNatureEnum,
        region: formData.region || null,
        contractor_company: formData.contractorCompany || null,
        technician: formData.technician || null,
        quantity_ordered: totalQuantity,
        dispatch_status: 'Pending',
        ordered_by: formData.orderedBy,
        deliver_to_part: formData.deliveryParty as DeliveryPartyEnum || null,
        pop_id: formData.popId || null,
        recipient_name: formData.recipientName || null,
        recipient_company_name: formData.recipientCompanyName || null,
        recipient_address: formData.recipientAddress || null,
        recipient_contact_number: formData.recipientContactNumber || null,
        recipient_email_address: formData.recipientEmail || null,
        order_location: formData.orderLocation || null,
        cell_phone_number: formData.cellPhoneNumber || null,
      };

      const { data: createdOrder, error: orderError } = await supabase
        .from('unique_orders')
        .insert(uniqueOrderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const uniqueOrderId = createdOrder.id;
      const autoGeneratedOrderId = createdOrder.order_id;
      const orderId = formatOrderNumber(autoGeneratedOrderId);

      // Prepare snapshots for n8n webhook
      const formDataSnapshot: OrderFormDataSnapshot = {
        dateOrdered: formattedDateOrdered,
        dateOrderedISO: isoDateOrdered,
        itemCategory: formData.itemCategory,
        itemNature: formData.itemNature,
        deliveryParty: formData.deliveryParty || '',
        orderedBy: formData.orderedBy,
        contractorCompany: formData.contractorCompany ?? null,
        region: formData.region ?? null,
        technician: formData.technician ?? null,
        orderLocation: formData.orderLocation ?? null,
        popId: formData.popId ?? null,
        recipientName: formData.recipientName ?? null,
        recipientCompanyName: formData.recipientCompanyName ?? null,
        recipientAddress: formData.recipientAddress ?? null,
        recipientContactNumber: formData.recipientContactNumber ?? null,
        recipientEmail: formData.recipientEmail ?? null,
        cellPhoneNumber: formData.cellPhoneNumber ?? null,
      };

      const cartItemSnapshots: CartItemSnapshot[] = cartItems.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        itemCategory: item.itemCategory,
        itemNature: item.itemNature,
        quantity: item.quantity,
        itemUrl: item.itemUrl ?? null,
      }));

      // Prepare line items for n8n webhook
      const orderLineWebhookPayloads: OrderLineWebhookPayload[] = cartItemSnapshots.map((item, index) => ({
        orderId,
        autoGeneratedOrderId,
        uniqueOrderRecordId: String(uniqueOrderId),
        dateOrdered: formattedDateOrdered,
        dateOrderedISO: isoDateOrdered,
        totalQuantity,
        lineNumber: index + 1,
        cartLength: cartItemSnapshots.length,
        itemCategory: item.itemCategory,
        itemNature: item.itemNature,
        deviceType: item.itemName,
        itemId: item.id,
        itemDescription: item.itemDescription,
        quantityOrdered: item.quantity,
        itemUrl: item.itemUrl,
        contractorCompany: formDataSnapshot.contractorCompany,
        region: formDataSnapshot.region,
        technician: formDataSnapshot.technician,
        orderedBy: formDataSnapshot.orderedBy,
        orderLocation: formDataSnapshot.orderLocation,
        deliverToPart: formDataSnapshot.deliveryParty,
        popId: formDataSnapshot.popId,
        recipientName: formDataSnapshot.recipientName,
        recipientCompanyName: formDataSnapshot.recipientCompanyName,
        recipientAddress: formDataSnapshot.recipientAddress,
        recipientContactNumber: formDataSnapshot.recipientContactNumber,
        recipientEmail: formDataSnapshot.recipientEmail,
        cellPhoneNumber: formDataSnapshot.cellPhoneNumber,
        formData: formDataSnapshot,
        cartItem: item,
      }));

      // Send webhook to n8n
      if (orderLineWebhookPayloads.length > 0) {
        await n8nService.notifyOrderPlaced({
          orderId,
          autoGeneratedOrderId,
          uniqueOrderRecordId: String(uniqueOrderId),
          totalItems: orderLineWebhookPayloads.length,
          totalQuantity,
          dateOrdered: formattedDateOrdered,
          dateOrderedISO: isoDateOrdered,
          orderedBy: formDataSnapshot.orderedBy,
          deliveryParty: formDataSnapshot.deliveryParty,
          contractorCompany: formDataSnapshot.contractorCompany,
          region: formDataSnapshot.region,
          formData: formDataSnapshot,
          cartItems: cartItemSnapshots,
          lineItems: orderLineWebhookPayloads,
          items: orderLineWebhookPayloads.map(({
            deviceType,
            quantityOrdered,
            itemUrl,
            itemDescription,
            itemCategory,
            itemNature,
            itemId,
          }) => ({
            deviceType,
            quantityOrdered,
            itemUrl,
            itemDescription,
            itemCategory,
            itemNature,
            itemId,
          })),
        });
      }

      return {
        orderId,
        orderRecordIds: [uniqueOrderId]
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw formatSupabaseError(error, 'order creation');
    }
  },

  async getUniqueOrders(filters?: {
    pickStatuses?: string[];
    dispatchStatuses?: string[];
    categories?: string[];
    search?: string;
  }): Promise<UniqueOrder[]> {
    try {
      let query = supabase
        .from('unique_orders')
        .select('*')
        .order('date_ordered', { ascending: true });

      if (filters?.pickStatuses?.length) {
        query = query.in('pick_status', filters.pickStatuses);
      }

      if (filters?.dispatchStatuses?.length) {
        query = query.in('dispatch_status', filters.dispatchStatuses);
      }

      if (filters?.categories?.length) {
        query = query.in('item_category', filters.categories);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`recipient_name.ilike.${searchTerm},recipient_company_name.ilike.${searchTerm},order_location.ilike.${searchTerm},waybill_number.ilike.${searchTerm},order_notes.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unique orders:', error);
      throw formatSupabaseError(error, 'unique orders fetch');
    }
  },

  async getUniqueOrder(recordId: number): Promise<UniqueOrder | null> {
    try {
      const { data, error } = await supabase
        .from('unique_orders')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching unique order:', error);
      throw formatSupabaseError(error, 'unique order fetch');
    }
  },

  async getStockOrderItems(orderNumber: number): Promise<StockOrder[]> {
    try {
      // Check if orderNumber is a string that starts with 'ORD-'
      const normalizedOrderNumber = typeof orderNumber === 'string' && (orderNumber as string).startsWith('ORD-')
        ? parseInt((orderNumber as string).replace('ORD-', ''), 10)
        : orderNumber;

      // If parsing failed or it's not a number, handle gracefully
      if (isNaN(normalizedOrderNumber)) {
        console.warn('Invalid order number passed to getStockOrderItems:', orderNumber);
        return [];
      }

      const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .eq('order_id', normalizedOrderNumber)
        .order('device_type', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stock order items:', error);
      throw formatSupabaseError(error, 'stock order items fetch');
    }
  },

  async getStockOrderItemsByOrders(orderNumbers: number[]): Promise<Record<number, StockOrder[]>> {
    try {
      if (orderNumbers.length === 0) return {};

      // Normalize order numbers: convert strings like 'ORD-0056' to integers
      const normalizedOrderNumbers = orderNumbers.map(orderNumber => {
        const normalized = typeof orderNumber === 'string' && (orderNumber as string).startsWith('ORD-')
          ? parseInt((orderNumber as string).replace('ORD-', ''), 10)
          : orderNumber;
        return isNaN(normalized) ? null : normalized;
      }).filter((num): num is number => num !== null);

      if (normalizedOrderNumbers.length === 0) return {};

      const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .in('order_id', normalizedOrderNumbers)
        .order('order_id', { ascending: true });

      if (error) throw error;

      const results: Record<number, StockOrder[]> = {};
      data?.forEach(item => {
        const orderId = item.order_id;
        if (!results[orderId]) {
          results[orderId] = [];
        }
        results[orderId].push(item);
      });

      return results;
    } catch (error) {
      console.error('Error fetching stock order items by orders:', error);
      throw formatSupabaseError(error, 'stock order items batch fetch');
    }
  },

  async getDispatchLog(orderNumber: number): Promise<DispatchLog[]> {
    try {
      // Normalize order number: convert string like 'ORD-0056' to integer
      const normalizedOrderNumber = typeof orderNumber === 'string' && (orderNumber as string).startsWith('ORD-')
        ? parseInt((orderNumber as string).replace('ORD-', ''), 10)
        : orderNumber;

      if (isNaN(normalizedOrderNumber)) {
        console.warn('Invalid order number passed to getDispatchLog:', orderNumber);
        return [];
      }

      const { data, error } = await supabase
        .from('dispatch_log')
        .select('*')
        .eq('order_id', normalizedOrderNumber)
        .order('date_dispatched', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dispatch log:', error);
      throw formatSupabaseError(error, 'dispatch log fetch');
    }
  },

  async updateStockOrderLinesFromPicking(pickedItems: StockOrderPickedUpdateInput[]) {
    try {
      if (!pickedItems.length) return;

      for (const item of pickedItems) {
        const updateData: StockOrderUpdate = {
          qty_dispatched: item.quantity,
          pick_status: normalizePickStatusValue(item.pickStatus) || 'Pending',
        };

        // Add stock_availability if provided
        const normalizedAvailability = normalizeStockAvailabilityValue(item.stockAvailability);
        if (normalizedAvailability) {
          (updateData as any).stock_availability = normalizedAvailability;
        }

        const { error } = await supabase
          .from('stock_order')
          .update(updateData)
          .eq('id', item.stockOrderId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating stock order line items:', error);
      throw formatSupabaseError(error, 'stock order line items update');
    }
  },

  async updateDispatchLogEntries(updates: DispatchLogUpdateInput[]) {
    try {
      if (!updates.length) return;

      for (const update of updates) {
        const { error } = await supabase
          .from('dispatch_log')
          .update(update.fields)
          .eq('id', update.recordId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating dispatch log entries:', error);
      throw formatSupabaseError(error, 'dispatch log update');
    }
  },

  async getPickingQueue(): Promise<UniqueOrder[]> {
    try {
      const { data, error } = await supabase
        .from('unique_orders')
        .select('*')
        .or('pick_status.is.null,pick_status.eq.Pending')
        .order('date_ordered', { ascending: true })
        .order('item_category', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching picking queue:', error);
      throw formatSupabaseError(error, 'picking queue fetch');
    }
  },

  async getDispatchQueue(): Promise<DispatchQueueOrder[]> {
    try {
      // Get orders that are picked but not dispatched
      const { data: orders, error: ordersError } = await supabase
        .from('unique_orders')
        .select('*')
        .in('pick_status', ['Picked', 'Partially Picked'])
        .or('dispatch_status.is.null,dispatch_status.eq.Pending')
        .order('date_ordered', { ascending: true })
        .order('item_category', { ascending: true });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) return [];

      // Get dispatch logs for these orders
      const orderIds = orders.map(o => o.order_id);
      const { data: dispatchLogs, error: logsError } = await supabase
        .from('dispatch_log')
        .select('*')
        .in('order_id', orderIds)
        .order('date_dispatched', { ascending: false });

      if (logsError) throw logsError;

      // Group dispatch logs by order_id
      const logsByOrderId = new Map<number, DispatchLog[]>();
      dispatchLogs?.forEach(log => {
        if (log.order_id) {
          const existing = logsByOrderId.get(log.order_id) || [];
          existing.push(log);
          logsByOrderId.set(log.order_id, existing);
        }
      });

      // Combine orders with their dispatch logs
      const ordersWithLogs: DispatchQueueOrder[] = orders.map(order => ({
        ...order,
        dispatchLogEntries: logsByOrderId.get(order.order_id) || [],
      }));

      return ordersWithLogs;
    } catch (error) {
      console.error('Error fetching dispatch queue:', error);
      throw formatSupabaseError(error, 'dispatch queue fetch');
    }
  },

  async updateUniqueOrder(recordId: number, fields: UniqueOrderUpdate): Promise<UniqueOrder> {
    try {
      const { data, error } = await supabase
        .from('unique_orders')
        .update(fields)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating unique order:', error);
      throw formatSupabaseError(error, 'unique order update');
    }
  },

  async getAll(): Promise<StockOrder[]> {
    try {
      const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .order('date_ordered', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw formatSupabaseError(error, 'orders fetch');
    }
  }
};

// ============================================
// SLA SERVICE
// ============================================
export type SlaStatus = 'on_track' | 'at_risk' | 'breached' | 'met';

export interface SlaAtRiskOrder {
  id: number;
  order_id: number;
  date_ordered: string;
  sla_deadline: string;
  sla_status: SlaStatus;
  dispatch_status: string;
  pick_status: string;
  technician: string | null;
  recipient_name: string | null;
  item_category: string | null;
  hours_remaining: number;
}

export interface SlaPerformanceSummary {
  order_date: string;
  total_orders: number;
  sla_met: number;
  sla_breached: number;
  sla_compliance_rate: number;
}

export const slaService = {
  // Calculate SLA deadline based on order time
  // Rule: Before 12 noon = same day 5pm, After 12 noon = next business day 3pm
  calculateDeadline(orderTime: Date): Date {
    const orderHour = orderTime.getHours();
    let deadline: Date;

    if (orderHour < 12) {
      deadline = new Date(orderTime);
      deadline.setHours(17, 0, 0, 0);
    } else {
      deadline = new Date(orderTime);
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(15, 0, 0, 0);

      const dayOfWeek = deadline.getDay();
      if (dayOfWeek === 0) deadline.setDate(deadline.getDate() + 1);
      else if (dayOfWeek === 6) deadline.setDate(deadline.getDate() + 2);
    }

    return deadline;
  },

  async getAtRiskOrders(): Promise<SlaAtRiskOrder[]> {
    try {
      const { data, error } = await supabase
        .from('unique_orders')
        .select('id, order_id, date_ordered, sla_deadline, sla_status, dispatch_status, pick_status, technician, recipient_name, item_category')
        .in('sla_status', ['at_risk', 'breached'])
        .in('dispatch_status', ['Pending', 'Partial'])
        .order('sla_deadline', { ascending: true });

      if (error) throw error;

      return (data || []).map(order => {
        const deadline = new Date(order.sla_deadline);
        const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
        return { ...order, hours_remaining: Math.round(hoursRemaining * 10) / 10 } as SlaAtRiskOrder;
      });
    } catch (error) {
      console.error('Error fetching at-risk orders:', error);
      throw formatSupabaseError(error, 'at-risk orders fetch');
    }
  },

  async getMetrics(): Promise<{ totalOrders: number; onTrack: number; atRisk: number; breached: number; met: number; complianceRate: number }> {
    try {
      const { data, error } = await supabase.from('unique_orders').select('sla_status').not('sla_status', 'is', null);
      if (error) throw error;

      const metrics = { totalOrders: 0, onTrack: 0, atRisk: 0, breached: 0, met: 0, complianceRate: 0 };
      (data || []).forEach(order => {
        metrics.totalOrders++;
        if (order.sla_status === 'on_track') metrics.onTrack++;
        else if (order.sla_status === 'at_risk') metrics.atRisk++;
        else if (order.sla_status === 'breached') metrics.breached++;
        else if (order.sla_status === 'met') metrics.met++;
      });

      const completed = metrics.met + metrics.breached;
      metrics.complianceRate = completed > 0 ? Math.round((metrics.met / completed) * 10000) / 100 : 0;
      return metrics;
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      throw formatSupabaseError(error, 'SLA metrics fetch');
    }
  }
};

// ============================================
// BACKORDER SERVICE
// ============================================
export type BackorderStatus = 'none' | 'backordered' | 'reactivated' | 'fulfilled';

export interface BackorderItem {
  stock_order_id: number;
  order_id: number;
  device_type: string;
  quantity_ordered: number;
  qty_dispatched: number;
  qty_backordered: number;
  backorder_created_at: string | null;
  technician: string | null;
  recipient_name: string | null;
  date_ordered: string;
}

export const backorderService = {
  async getBackorderQueue(): Promise<BackorderItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_order')
        .select(`id, order_id, device_type, quantity_ordered, qty_dispatched, qty_backordered, backorder_created_at, technician, unique_orders!inner (recipient_name, date_ordered)`)
        .eq('backorder_status', 'backordered')
        .order('backorder_created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        stock_order_id: item.id,
        order_id: item.order_id,
        device_type: item.device_type,
        quantity_ordered: item.quantity_ordered,
        qty_dispatched: item.qty_dispatched || 0,
        qty_backordered: item.qty_backordered || 0,
        backorder_created_at: item.backorder_created_at,
        technician: item.technician,
        recipient_name: item.unique_orders?.recipient_name || null,
        date_ordered: item.unique_orders?.date_ordered || ''
      }));
    } catch (error) {
      console.error('Error fetching backorder queue:', error);
      throw formatSupabaseError(error, 'backorder queue fetch');
    }
  },

  async markAsBackordered(stockOrderId: number, qtyBackordered: number, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_order')
        .update({
          backorder_status: 'backordered',
          qty_backordered: qtyBackordered,
          backorder_created_at: new Date().toISOString(),
          backorder_notes: notes || null,
          stock_availability: 'Backordered'
        })
        .eq('id', stockOrderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking item as backordered:', error);
      throw formatSupabaseError(error, 'backorder marking');
    }
  },

  async reactivateBackorder(stockOrderId: number, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_order')
        .update({
          backorder_status: 'reactivated',
          backorder_reactivated_at: new Date().toISOString(),
          backorder_notes: notes || null,
          stock_availability: 'Available',
          pick_status: 'Pending'
        })
        .eq('id', stockOrderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error reactivating backorder:', error);
      throw formatSupabaseError(error, 'backorder reactivation');
    }
  },

  async bulkReactivate(stockOrderIds: number[], notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_order')
        .update({
          backorder_status: 'reactivated',
          backorder_reactivated_at: new Date().toISOString(),
          backorder_notes: notes || null,
          stock_availability: 'Available',
          pick_status: 'Pending'
        })
        .in('id', stockOrderIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk reactivating backorders:', error);
      throw formatSupabaseError(error, 'bulk backorder reactivation');
    }
  },

  async findByDeviceType(deviceType: string): Promise<BackorderItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_order')
        .select(`id, order_id, device_type, quantity_ordered, qty_dispatched, qty_backordered, backorder_created_at, technician, unique_orders!inner (recipient_name, date_ordered)`)
        .eq('backorder_status', 'backordered')
        .ilike('device_type', `%${deviceType}%`)
        .order('backorder_created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        stock_order_id: item.id,
        order_id: item.order_id,
        device_type: item.device_type,
        quantity_ordered: item.quantity_ordered,
        qty_dispatched: item.qty_dispatched || 0,
        qty_backordered: item.qty_backordered || 0,
        backorder_created_at: item.backorder_created_at,
        technician: item.technician,
        recipient_name: item.unique_orders?.recipient_name || null,
        date_ordered: item.unique_orders?.date_ordered || ''
      }));
    } catch (error) {
      console.error('Error finding backorders by device type:', error);
      throw formatSupabaseError(error, 'backorder search');
    }
  }
};

// Input types for updates
export type StockOrderPickedUpdateInput = {
  stockOrderId: number;
  quantity: number;
  stockAvailability: string;
  pickStatus: string;
};

export type DispatchLogUpdateInput = {
  recordId: number;
  fields: DispatchLogUpdate;
};
