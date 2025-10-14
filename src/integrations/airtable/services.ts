import { tables } from './client';
import type { 
  InventoryItem, 
  PointOfPresence, 
  BusinessLine, 
  Order,
  OrderFormData,
  CartItem
} from '@/types/airtable';

const formatAirtableError = (error: unknown, context: string) => {
  const baseMessage = `Airtable ${context} failed`;

  if (error instanceof Error) {
    return new Error(`${baseMessage}: ${error.message}`);
  }

  if (typeof error === 'object' && error !== null) {
    const rawError = (error as { message?: unknown; error?: { message?: unknown; type?: unknown } });

    const messages = [
      rawError?.message,
      rawError?.error?.message,
      rawError?.error?.type,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (messages.length > 0) {
      return new Error(`${baseMessage}: ${messages.join(' - ')}`);
    }
  }

  return new Error(`${baseMessage}: Unexpected error`);
};

// Inventory Services
export const inventoryService = {
  /**
   * Get all inventory items with optional filtering
   */
  async getAll(filters?: { category?: string; serialized?: 'Y' | 'N' }): Promise<InventoryItem[]> {
    try {
      const filterFormula = [];
      
      if (filters?.category) {
        // Handle Modems -> MODEM mapping
        const categoryValue = filters.category === 'Modems' ? 'MODEM' : filters.category;
        filterFormula.push(`{Item Category} = '${categoryValue}'`);
      }
      
      if (filters?.serialized) {
        filterFormula.push(`{Serialized} = '${filters.serialized}'`);
      }
      
      const records = await tables.inventory
        .select({
          filterByFormula: filterFormula.length > 0 ? `AND(${filterFormula.join(', ')})` : '',
          sort: [{ field: 'Device Type', direction: 'asc' }]
        })
        .all();
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as InventoryItem['fields']
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw formatAirtableError(error, 'inventory fetch');
    }
  },

  /**
   * Search inventory items by text
   */
  async search(query: string, filters?: { category?: string; serialized?: 'Y' | 'N' }): Promise<InventoryItem[]> {
    const items = await this.getAll(filters);
    
    if (!query) return items;
    
    const searchLower = query.toLowerCase();
    return items.filter(item => 
      item.fields['Device Type']?.toLowerCase().includes(searchLower) ||
      item.fields['Item Description']?.toLowerCase().includes(searchLower)
    );
  }
};

// Point of Presence Services
export const popService = {
  /**
   * Get all technicians/locations
   */
  async getAll(): Promise<PointOfPresence[]> {
    try {
      const records = await tables.pointOfPresence
        .select({
          sort: [{ field: 'Name & Surname', direction: 'asc' }]
        })
        .all();
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as PointOfPresence['fields']
      }));
    } catch (error) {
      console.error('Error fetching Point of Presence:', error);
      throw formatAirtableError(error, 'Point of Presence fetch');
    }
  },

  /**
   * Get unique contractor companies
   */
  async getContractors(): Promise<string[]> {
    const records = await this.getAll();
    const contractors = [...new Set(records.map(r => r.fields.Contractor).filter(Boolean))] as string[];
    return contractors.sort();
  },

  /**
   * Get unique regions
   */
  async getRegions(contractor?: string): Promise<string[]> {
    let records = await this.getAll();
    
    if (contractor) {
      records = records.filter(r => r.fields.Contractor === contractor);
    }
    
    const regions = [...new Set(records.map(r => r.fields.Region).filter(Boolean))] as string[];
    return regions.sort();
  },

  /**
   * Get technicians filtered by contractor and region
   */
  async getTechnicians(contractor?: string, region?: string): Promise<PointOfPresence[]> {
    let records = await this.getAll();
    
    if (contractor) {
      records = records.filter(r => r.fields.Contractor === contractor);
    }
    
    if (region) {
      records = records.filter(r => r.fields.Region === region);
    }
    
    return records;
  },

  /**
   * Get technician by name
   */
  async getByName(name: string): Promise<PointOfPresence | null> {
    const records = await this.getAll();
    return records.find(r => r.fields['Name & Surname'] === name) || null;
  }
};

// Business Lines Services
export const businessLinesService = {
  /**
   * Get all business lines
   */
  async getAll(): Promise<BusinessLine[]> {
    try {
      const records = await tables.businessLines.select().all();
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as BusinessLine['fields']
      }));
    } catch (error) {
      console.error('Error fetching business lines:', error);
      throw formatAirtableError(error, 'business lines fetch');
    }
  },

  /**
   * Get unique item categories with custom sort order
   */
  async getCategories(): Promise<string[]> {
    const records = await this.getAll();
    const categories = [...new Set(records.map(r => r.fields['Item Category']).filter(Boolean))] as string[];
    
    // Custom sort order matching PowerApps
    const sortOrder = ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];
    
    return categories.sort((a, b) => {
      const indexA = sortOrder.indexOf(a);
      const indexB = sortOrder.indexOf(b);
      
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  },

  /**
   * Get item natures for a specific category
   */
  async getNaturesByCategory(category: string): Promise<string[]> {
    const records = await this.getAll();
    const filtered = records.filter(r => r.fields['Item Category'] === category);
    const natures = [...new Set(filtered.map(r => r.fields['Item Nature']).filter(Boolean))] as string[];
    return natures;
  }
};

// Order Services
export const orderService = {
  /**
   * Create a new order with multiple items
   */
  async create(formData: OrderFormData, cartItems: CartItem[]): Promise<{ orderId: string; orderRecordIds: string[] }> {
    try {
      // Generate a unique order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const popIdValue = formData.popId && !Number.isNaN(Number(formData.popId))
        ? Number(formData.popId)
        : undefined;
      
      // Create order records for each cart item
      const orderRecords = cartItems.map(item => ({
        fields: {
          'Order ID': orderId,
          'Date Ordered': formData.dateOrdered.toISOString().split('T')[0],
          'Item Category': formData.itemCategory,
          'Item Nature': item.itemNature || formData.itemNature,
          'Device type': item.deviceType,
          'Quantity ordered': item.quantity,
          'Ordered by': formData.orderedBy,
          'Deliver to Part': formData.deliveryParty,
          ...(formData.contractorCompany && { 'Contractor Company': formData.contractorCompany }),
          ...(formData.region && { 'Region': formData.region }),
          ...(formData.technician && { 'Technician': formData.technician }),
          ...(formData.onBehalfOf && { 'On Behalf of': formData.onBehalfOf }),
          ...(formData.orderLocation && { 'Order Location': formData.orderLocation }),
          ...(popIdValue !== undefined && { 'PoPID': popIdValue }),
          ...(formData.recipientName && { 'Recipient Name': formData.recipientName }),
          ...(formData.recipientCompanyName && { 'Recipient Company Name': formData.recipientCompanyName }),
          ...(formData.recipientAddress && { 'Recipient Address': formData.recipientAddress }),
          ...(formData.recipientContactNumber && { 'Recipient Contact Number': formData.recipientContactNumber }),
          ...(formData.recipientEmail && { 'Recipient Email Address': formData.recipientEmail }),
          'Status': 'Pending'
        }
      }));

      // Create records in batches of 10 (Airtable limit)
      const createdRecords = [];
      for (let i = 0; i < orderRecords.length; i += 10) {
        const batch = orderRecords.slice(i, i + 10);
        const created = await tables.orders.create(batch);
        createdRecords.push(...created);
      }

      return {
        orderId,
        orderRecordIds: createdRecords.map(r => r.id)
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw formatAirtableError(error, 'order creation');
    }
  },

  /**
   * Get all orders
   */
  async getAll(): Promise<Order[]> {
    try {
      const records = await tables.orders
        .select({
          sort: [{ field: 'Date Ordered', direction: 'desc' }]
        })
        .all();
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as Order['fields']
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw formatAirtableError(error, 'orders fetch');
    }
  },

  /**
   * Get orders by Order ID
   */
  async getByOrderId(orderId: string): Promise<Order[]> {
    try {
      const records = await tables.orders
        .select({
          filterByFormula: `{Order ID} = '${orderId}'`
        })
        .all();
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as Order['fields']
      }));
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw formatAirtableError(error, 'order lookup by ID');
    }
  }
};

