import { tables } from './client';
import type { 
  InventoryItem, 
  PointOfPresence, 
  BusinessLine, 
  Order,
  OrderFormData,
  CartItem
} from '@/types/airtable';
import { n8nService } from '@/integrations/n8n';

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

const coerceToString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? coerceToString(value[0]) : undefined;
  }

  return undefined;
};

const normalizePointOfPresenceFields = (fields: Record<string, unknown>): PointOfPresence['fields'] => {
  const getField = (...aliases: string[]): string | undefined => {
    for (const alias of aliases) {
      if (alias in fields) {
        const value = coerceToString(fields[alias]);
        if (value) {
          return value;
        }
      }
    }
    return undefined;
  };

  const name = getField('Name & Surname', ' Name & Surname', 'Name', 'TechName');
  const contractor = getField('Contractor', ' Contractor');
  const region = getField('Region', ' Region', 'RegionCode');
  const email = getField('Email Address', ' Email Address');
  const areaBased = getField('Area Based', ' Area Based', 'AreaBased');
  const locationCode = getField('Location Code', ' Location Code', 'LocationCode');
  const contactNumber = getField('Contact Number', ' Contact Number', 'Mobile', ' Mobile');

  return {
    'Name & Surname': name ?? '',
    'Contractor': contractor ?? '',
    'Region': region ?? '',
    'Email Address': email ?? '',
    ...(areaBased ? { 'Area Based': areaBased } : {}),
    ...(locationCode ? { 'Location Code': locationCode } : {}),
    ...(contactNumber ? { 'Contact Number': contactNumber } : {}),
  };
};

const CATEGORY_SORT_ORDER = ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];
const NATURE_SORT_ORDER = ['Serialised', 'Non-serialised'];

const sortCategories = (categories: string[]) => {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_SORT_ORDER.indexOf(a);
    const indexB = CATEGORY_SORT_ORDER.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

const sortNatures = (natures: string[]) => {
  return natures.sort((a, b) => {
    const indexA = NATURE_SORT_ORDER.indexOf(a);
    const indexB = NATURE_SORT_ORDER.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

// Inventory Services
export const inventoryService = {
  /**
   * Get all inventory items with optional filtering
   */
  async getAll(filters?: { category?: string; serialized?: string }): Promise<InventoryItem[]> {
    try {
      const filterFormula = [];
      
      if (filters?.category) {
        filterFormula.push(`{Item_Category} = '${filters.category}'`);
      }
      
      if (filters?.serialized) {
        filterFormula.push(`{Item_Nature} = '${filters.serialized}'`);
      }
      
      const records = await tables.inventory
        .select({
          filterByFormula: filterFormula.length > 0 ? `AND(${filterFormula.join(', ')})` : '',
          sort: [{ field: 'Item_Name', direction: 'asc' }]
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
  async search(query: string, filters?: { category?: string; serialized?: string }): Promise<InventoryItem[]> {
    const items = await this.getAll(filters);
    
    if (!query) return items;
    
    const searchLower = query.toLowerCase();
    return items.filter(item => 
      item.fields['Item_Name']?.toLowerCase().includes(searchLower) ||
      item.fields['Item_Description']?.toLowerCase().includes(searchLower)
    );
  },

  async getCategories(): Promise<string[]> {
    try {
      const records = await tables.inventory.select().all();

      const categories = new Set<string>();
      records.forEach(record => {
        const value = coerceToString((record.fields as Record<string, unknown>)['Item_Category']);
        if (value) {
          categories.add(value);
        }
      });

      return sortCategories(Array.from(categories));
    } catch (error) {
      console.error('Error fetching inventory categories:', error);
      throw formatAirtableError(error, 'inventory categories fetch');
    }
  },

  async getNaturesByCategory(category?: string): Promise<string[]> {
    try {
      const records = await tables.inventory.select().all();

      const natures = new Set<string>();
      records.forEach(record => {
        const fields = record.fields as Record<string, unknown>;
        const recordCategory = coerceToString(fields['Item_Category']);
        if (category && recordCategory !== category) {
          return;
        }

        const nature = coerceToString(fields['Item_Nature']);
        if (nature) {
          natures.add(nature);
        }
      });

      return sortNatures(Array.from(natures));
    } catch (error) {
      console.error('Error fetching inventory natures:', error);
      throw formatAirtableError(error, 'inventory natures fetch');
    }
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
        .select()
        .all();

      const normalized = records.map(record => ({
        id: record.id,
        fields: normalizePointOfPresenceFields(record.fields)
      }));

      return normalized.sort((a, b) =>
        a.fields['Name & Surname'].localeCompare(b.fields['Name & Surname'], undefined, { sensitivity: 'base' })
      );
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

      const formattedDateOrdered = formData.dateOrdered.toISOString().split('T')[0];

      const popIdValue = formData.popId && !Number.isNaN(Number(formData.popId))
        ? Number(formData.popId)
        : undefined;
      
      const orderLineWebhookPayloads = cartItems.map(item => ({
        orderId,
        dateOrdered: formattedDateOrdered,
        itemCategory: formData.itemCategory,
        itemNature: item.itemNature || formData.itemNature,
        deviceType: item.itemName,
        quantityOrdered: item.quantity,
        contractorCompany: formData.contractorCompany,
        region: formData.region,
        technician: formData.technician,
        orderedBy: formData.orderedBy,
        orderLocation: formData.orderLocation,
        deliverToPart: formData.deliveryParty,
        onBehalfOf: formData.onBehalfOf,
        popId: formData.popId,
        recipientName: formData.recipientName,
        recipientCompanyName: formData.recipientCompanyName,
        recipientAddress: formData.recipientAddress,
        recipientContactNumber: formData.recipientContactNumber,
        recipientEmail: formData.recipientEmail,
      }));

      // Create order records for each cart item
      // Note: Stock_Order table has limited fields compared to Unique_Orders
      const orderRecords = cartItems.map(item => ({
        fields: {
          'Order Id': orderId,
          'Date Ordered': formattedDateOrdered,
          'Item Category': formData.itemCategory,
          'Item Nature': item.itemNature || formData.itemNature,
          'Device type': item.itemName,
          'Quantity ordered': item.quantity,
          'Ordered by': formData.orderedBy,
          'Dispatch to': formData.deliveryParty,
          ...(formData.contractorCompany && { 'Contractor Company': formData.contractorCompany }),
          ...(formData.region && { 'Region': formData.region }),
          ...(formData.technician && { 'Technician': formData.technician }),
          ...(formData.orderLocation && { 'Order Location': formData.orderLocation }),
          'Dispatch Status': 'Pending'
        }
      }));

      // Create records in batches of 10 (Airtable limit)
      const createdRecords = [];
      for (let i = 0; i < orderRecords.length; i += 10) {
        const batch = orderRecords.slice(i, i + 10);
        const created = await tables.orders.create(batch);
        createdRecords.push(...created);
      }

      if (orderLineWebhookPayloads.length > 0) {
        await Promise.all(
          orderLineWebhookPayloads.map(payload => n8nService.submitOrderLine(payload))
        );

        await n8nService.notifyOrderPlaced({
          orderId,
          totalItems: orderLineWebhookPayloads.length,
          dateOrdered: formattedDateOrdered,
          orderedBy: formData.orderedBy,
          deliveryParty: formData.deliveryParty,
          contractorCompany: formData.contractorCompany,
          region: formData.region,
          items: orderLineWebhookPayloads.map(({ deviceType, quantityOrdered }) => ({
            deviceType,
            quantityOrdered,
          })),
        });
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
          filterByFormula: `{Order Id} = '${orderId}'`
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

