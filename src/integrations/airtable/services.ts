import { tables } from './client';
import type {
  InventoryItem,
  PointOfPresence,
  BusinessLine,
  Order,
  OrderFormData,
  CartItem,
  UniqueOrder,
  StockOrderLineItem,
  DispatchLogEntry,
  DispatchQueueOrder,
} from '@/types/airtable';
import {
  n8nService,
  type OrderFormDataSnapshot,
  type CartItemSnapshot,
  type OrderLineWebhookPayload,
} from '@/integrations/n8n';
import { formatOrderNumber } from '@/lib/orders';

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

const escapeAirtableValue = (value: string) => value.replace(/'/g, "\\'");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normaliseOrderIdInput = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && value.length > 0) {
    return normaliseOrderIdInput(value[0]);
  }

  return undefined;
};

const buildOrderIdForms = (value: unknown) => {
  const normalised = normaliseOrderIdInput(value);
  const stringValues = new Set<string>();
  const comparisonForms = new Set<string>();
  const numericValues = new Set<number>();

  if (!normalised) {
    return { stringValues: Array.from(stringValues), comparisonForms, numericValues: Array.from(numericValues) };
  }

  const pushString = (candidate: string | undefined) => {
    if (!candidate) return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    stringValues.add(trimmed);
    comparisonForms.add(trimmed.toUpperCase());
  };

  pushString(normalised);
  pushString(normalised.toUpperCase());

  const digitsOnly = normalised.replace(/[^0-9]/g, '');
  if (digitsOnly.length > 0) {
    pushString(digitsOnly);
    const padded = digitsOnly.padStart(4, '0');
    pushString(padded);
    pushString(`ORD-${digitsOnly}`);
    pushString(`ORD-${padded}`);

    const numeric = Number.parseInt(digitsOnly, 10);
    if (!Number.isNaN(numeric)) {
      numericValues.add(numeric);
    }
  }

  return {
    stringValues: Array.from(stringValues),
    comparisonForms,
    numericValues: Array.from(numericValues),
  };
};

const buildOrderIdFilterClauses = (value: unknown) => {
  const { stringValues, numericValues, comparisonForms } = buildOrderIdForms(value);

  // Order Id is now a number field in Airtable, so we only need numeric comparison
  const numericClauses = numericValues.map((numeric) => `{Order Id} = ${numeric}`);

  const clauses = [...numericClauses];

  return {
    clauses,
    comparisonForms,
  };
};

const castRecordFields = <T>(fields: unknown): T => fields as unknown as T;

const extractOrderNumber = (fields: Record<string, unknown>): number | null => {
  const rawValue = fields['Order ID'];

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const waitForOrderNumber = async (
  recordId: string,
  initialFields: Record<string, unknown>,
  {
    attempts = 6,
    delayMs = 500,
  }: {
    attempts?: number;
    delayMs?: number;
  } = {}
): Promise<{ orderNumber: number; fields: Record<string, unknown> }> => {
  let fields = initialFields;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const orderNumber = extractOrderNumber(fields);

    if (orderNumber !== null) {
      return { orderNumber, fields };
    }

    if (attempt < attempts - 1) {
      await delay(delayMs);
      const refreshedRecord = await tables.uniqueOrders.find(recordId);
      fields = refreshedRecord.fields as Record<string, unknown>;
    }
  }

  throw new Error('Timed out waiting for Airtable to generate an Order ID.');
};

const buildOrFormula = (field: string, values: string[], includeBlank = false) => {
  const clauses = [...values.map(value => `{${field}} = '${escapeAirtableValue(value)}'`)];
  if (includeBlank) {
    clauses.push(`{${field}} = ''`, `IS_BLANK({${field}})`);
  }

  if (clauses.length === 0) {
    return '';
  }

  return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
          sort: [{ field: 'Device Type', direction: 'asc' }]
        })
        .all();
      
      return records.map(record => ({
        id: record.id,
        fields: castRecordFields<InventoryItem['fields']>(record.fields)
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
      item.fields['Device Type']?.toLowerCase().includes(searchLower) ||
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
        fields: castRecordFields<BusinessLine['fields']>(record.fields)
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

type StockOrderPickedUpdate = {
  stockOrderId: string;
  quantity: number;
  stockAvailability: string;
  pickStatus: string;
};

const normalizeOptionalField = (value?: string | null) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeStockAvailability = (value?: string | null) => {
  const normalized = normalizeOptionalField(value);
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();

  if (lower === 'in stock') {
    return 'In Stock';
  }

  if (lower === 'out of stock') {
    return 'Out of stock';
  }

  return normalized;
};

const normalizePickStatusValue = (value?: string | null): string | undefined => {
  const normalized = normalizeOptionalField(value);
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();

  if (lower.includes('not picked')) {
    return 'not picked';
  }

  if (lower.includes('partial')) {
    return 'partially picked';
  }

  if (lower.includes('picked')) {
    return 'picked';
  }

  return normalized;
};

const mapPickStatusForAirtable = (value?: string | null) => {
  const normalized = normalizePickStatusValue(value);

  if (!normalized) {
    return undefined;
  }

  switch (normalized) {
    case 'picked':
      return 'Picked';
    case 'partially picked':
      return 'Partially Picked';
    case 'not picked':
      return 'Not Picked';
    default:
      return normalized;
  }
};

const pickStatusPriority = (value?: string | null) => {
  const normalized = normalizePickStatusValue(value);

  switch (normalized) {
    case 'not picked':
      return 3;
    case 'partially picked':
      return 2;
    case 'picked':
      return 1;
    default:
      return 0;
  }
};

const mergePickStatuses = (current?: string | null, incoming?: string | null) => {
  if (!current) {
    return normalizePickStatusValue(incoming) ?? incoming ?? current;
  }

  if (!incoming) {
    return normalizePickStatusValue(current) ?? current;
  }

  const currentNormalized = normalizePickStatusValue(current) ?? current;
  const incomingNormalized = normalizePickStatusValue(incoming) ?? incoming;

  return pickStatusPriority(incomingNormalized) > pickStatusPriority(currentNormalized)
    ? incomingNormalized
    : currentNormalized;
};

const aggregatePickedItemsByRecord = (pickedItems: StockOrderPickedUpdate[]): StockOrderPickedUpdate[] => {
  const grouped = new Map<string, StockOrderPickedUpdate>();

  pickedItems.forEach((item) => {
    const existing = grouped.get(item.stockOrderId);

    if (!existing) {
      grouped.set(item.stockOrderId, {
        ...item,
        stockAvailability: normalizeStockAvailability(item.stockAvailability) ?? item.stockAvailability,
        pickStatus: normalizePickStatusValue(item.pickStatus) ?? item.pickStatus,
      });
      return;
    }

    existing.quantity += item.quantity;
    existing.pickStatus = mergePickStatuses(existing.pickStatus, item.pickStatus) ?? existing.pickStatus;
    const normalizedStockAvailability = normalizeStockAvailability(item.stockAvailability);
    if (normalizedStockAvailability !== undefined) {
      existing.stockAvailability = normalizedStockAvailability;
    }
  });

  return Array.from(grouped.entries()).map(([stockOrderId, item]) => ({
    ...item,
    stockOrderId,
    stockAvailability: normalizeStockAvailability(item.stockAvailability) ?? item.stockAvailability,
    pickStatus: normalizePickStatusValue(item.pickStatus) ?? item.pickStatus,
  }));
};

const mapPickedItemToStockOrderUpdate = (pickedItem: StockOrderPickedUpdate) => {
  const fields: Partial<StockOrderLineItem['fields']> = {};

  if (Number.isFinite(pickedItem.quantity)) {
    fields['QTY dispatched'] = pickedItem.quantity;
  }

  const pickStatus = mapPickStatusForAirtable(pickedItem.pickStatus);
  if (pickStatus !== undefined) {
    fields['Pick Status'] = pickStatus;
  }

  return {
    id: pickedItem.stockOrderId,
    fields,
  };
};

const updateStockOrderLineItems = async (pickedItems: StockOrderPickedUpdate[]) => {
  if (!pickedItems.length) {
    return;
  }

  const aggregated = aggregatePickedItemsByRecord(pickedItems);
  const updates = aggregated.map(mapPickedItemToStockOrderUpdate);

  const batches = chunkArray(updates, 10);

  for (const batch of batches) {
    await tables.orders.update(batch as any);
  }
};

export type StockOrderPickedUpdateInput = StockOrderPickedUpdate;

export type DispatchLogUpdateInput = {
  recordId: string;
  fields: Partial<DispatchLogEntry['fields']>;
};

const updateDispatchLogEntries = async (updates: DispatchLogUpdateInput[]) => {
  if (!updates.length) {
    return;
  }

  const batches = chunkArray(
    updates.map((update) => ({
      id: update.recordId,
      fields: update.fields,
    })),
    10,
  );

  for (const batch of batches) {
    await tables.dispatchLog.update(batch as any);
  }
};

// Order Services
export const orderService = {
  /**
   * Create a new order with multiple items
   * Flow: 
   * 1. Create single record in Unique_Orders table with order summary
   * 2. Send all line items to n8n webhook
   * 3. n8n loops through line items and creates Stock_Order records
   */
  async create(formData: OrderFormData, cartItems: CartItem[]): Promise<{ orderId: string; orderRecordIds: string[] }> {
    try {
      const isoDateOrdered = formData.dateOrdered.toISOString();
      const formattedDateOrdered = isoDateOrdered.split('T')[0];

      const formDataSnapshot: OrderFormDataSnapshot = {
        dateOrdered: formattedDateOrdered,
        dateOrderedISO: isoDateOrdered,
        itemCategory: formData.itemCategory,
        itemNature: formData.itemNature,
        deliveryParty: formData.deliveryParty,
        orderedBy: formData.orderedBy,
        contractorCompany: formData.contractorCompany ?? null,
        region: formData.region ?? null,
        technician: formData.technician ?? null,
        onBehalfOf: formData.onBehalfOf ?? null,
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

      // Calculate total quantity across all items
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create single order record in Unique_Orders table
      const uniqueOrderRecord = await tables.uniqueOrders.create([{
        fields: {
          'Date Ordered': formattedDateOrdered,
          'Item Category': formData.itemCategory,
          'Item Nature': formData.itemNature,
          'Region': formData.region || undefined,
          'Contractor Company': formData.contractorCompany || undefined,
          'Technician': formData.technician || undefined,
          'Quantity Ordered': totalQuantity,
          'Dispatch Status': 'Pending',
          'Ordered by': formData.orderedBy,
          'Deliver to Part': formData.deliveryParty,
          ...(formData.onBehalfOf && { 'On Behalf of': formData.onBehalfOf }),
          ...(formData.popId && { 'PoPID': formData.popId }),
          ...(formData.recipientName && { 'Recipient Name': formData.recipientName }),
          ...(formData.recipientCompanyName && { 'Recipient Company Name': formData.recipientCompanyName }),
          ...(formData.recipientAddress && { 'Recipient Address': formData.recipientAddress }),
          ...(formData.recipientContactNumber && { 'Recipient Contact Number': formData.recipientContactNumber }),
          ...(formData.recipientEmail && { 'Recipient Email Address': formData.recipientEmail }),
          ...(formData.orderLocation && { 'Order Location': formData.orderLocation }),
          ...(formData.cellPhoneNumber && { 'CellPhone Number': formData.cellPhoneNumber }),
        }
      }]);

      const createdRecord = uniqueOrderRecord[0];
      const uniqueOrderId = createdRecord.id;

      const { orderNumber: autoGeneratedOrderId } = await waitForOrderNumber(
        uniqueOrderId,
        createdRecord.fields as Record<string, unknown>
      );

      const orderId = `ORD-${autoGeneratedOrderId}`;

      // Prepare line items payload for n8n webhook
      // n8n will loop through these and create Stock_Order records
      const orderLineWebhookPayloads: OrderLineWebhookPayload[] = cartItemSnapshots.map((item, index) => ({
        orderId,
        autoGeneratedOrderId,
        uniqueOrderRecordId: uniqueOrderId,
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
        onBehalfOf: formDataSnapshot.onBehalfOf,
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

      // Send single webhook with ALL line items in an array
      // n8n will loop through the array to create Stock_Order records, then send email
      if (orderLineWebhookPayloads.length > 0) {
        await n8nService.notifyOrderPlaced({
          orderId,
          autoGeneratedOrderId,
          uniqueOrderRecordId: uniqueOrderId,
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
          // Send FULL line item data in array for n8n to loop through
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
        orderRecordIds: [uniqueOrderId] // Return the Unique_Orders record ID
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
        fields: castRecordFields<Order['fields']>(record.fields)
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
        fields: castRecordFields<Order['fields']>(record.fields)
      }));
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw formatAirtableError(error, 'order lookup by ID');
    }
  },

  async getUniqueOrders(filters?: {
    pickStatuses?: string[];
    dispatchStatuses?: string[];
    categories?: string[];
    search?: string;
  }): Promise<UniqueOrder[]> {
    try {
      const formulas: string[] = [];

      if (filters?.pickStatuses?.length) {
        const formula = buildOrFormula('Pick Status', filters.pickStatuses, false);
        if (formula) formulas.push(formula);
      }

      if (filters?.dispatchStatuses?.length) {
        const formula = buildOrFormula('Dispatch Status', filters.dispatchStatuses);
        if (formula) formulas.push(formula);
      }

      if (filters?.categories?.length) {
        const formula = buildOrFormula('Item Category', filters.categories);
        if (formula) formulas.push(formula);
      }

      if (filters?.search) {
        const search = escapeAirtableValue(filters.search);
        formulas.push(`OR(
          SEARCH('${search}', {Recipient Name} & ''),
          SEARCH('${search}', {Recipient Company Name} & ''),
          SEARCH('${search}', {Order Location} & ''),
          SEARCH('${search}', {WayBill Number} & ''),
          SEARCH('${search}', {Order Notes} & '')
        )`);
      }

      const filterByFormula = formulas.length === 0
        ? undefined
        : formulas.length === 1
          ? formulas[0]
          : `AND(${formulas.join(', ')})`;

      const records = await tables.uniqueOrders
        .select({
          ...(filterByFormula ? { filterByFormula } : {}),
          sort: [
            { field: 'Pick Status', direction: 'asc' },
            { field: 'Dispatch Status', direction: 'asc' },
            { field: 'Date Ordered', direction: 'asc' }
          ],
        })
        .all();

      return records.map(record => ({
        id: record.id,
        fields: castRecordFields<UniqueOrder['fields']>(record.fields)
      }));
    } catch (error) {
      console.error('Error fetching unique orders:', error);
      throw formatAirtableError(error, 'unique orders fetch');
    }
  },

  async getUniqueOrder(recordId: string): Promise<UniqueOrder | null> {
    try {
      const record = await tables.uniqueOrders.find(recordId);
      return {
        id: record.id,
        fields: castRecordFields<UniqueOrder['fields']>(record.fields)
      };
    } catch (error) {
      console.error('Error fetching unique order:', error);
      throw formatAirtableError(error, 'unique order fetch');
    }
  },

  async getStockOrderItems(orderNumber: string): Promise<StockOrderLineItem[]> {
    try {
      const { clauses, comparisonForms } = buildOrderIdFilterClauses(orderNumber);

      const filterByFormula = clauses.length === 0
        ? undefined
        : clauses.length === 1
          ? clauses[0]
          : `OR(${clauses.join(', ')})`;

      const records = await tables.orders
        .select({
          ...(filterByFormula ? { filterByFormula } : {}),
          sort: [
            { field: 'Date Ordered', direction: 'asc' },
            { field: 'Device Type', direction: 'asc' }
          ]
        })
        .all();

      return records
        .filter((record) => {
          if (comparisonForms.size === 0) {
            return true;
          }

          const recordForms = buildOrderIdForms(record.fields['Order Id']).comparisonForms;
          for (const form of recordForms) {
            if (comparisonForms.has(form)) {
              return true;
            }
          }
          return false;
        })
        .map(record => ({
          id: record.id,
          fields: castRecordFields<StockOrderLineItem['fields']>(record.fields)
        }));
    } catch (error) {
      console.error('Error fetching stock order items:', error);
      throw formatAirtableError(error, 'stock order items fetch');
    }
  },

  async getStockOrderItemsByOrders(orderNumbers: string[]): Promise<Record<string, StockOrderLineItem[]>> {
    const uniqueOrderNumbers = Array.from(new Set(orderNumbers.filter(Boolean)));

    if (uniqueOrderNumbers.length === 0) {
      return {};
    }

    const orderMatchers = uniqueOrderNumbers
      .map((orderNumber) => {
        const { clauses, comparisonForms } = buildOrderIdFilterClauses(orderNumber);
        return {
          orderNumber,
          clauses,
          comparisonForms,
        };
      })
      .filter((matcher) => matcher.clauses.length > 0);

    const allClauses = orderMatchers.flatMap((matcher) => matcher.clauses);

    if (allClauses.length === 0) {
      return {};
    }

    const batches = chunkArray(allClauses, 30);
    const results: Record<string, StockOrderLineItem[]> = {};

    for (const batch of batches) {
      const filterByFormula = batch.length === 1 ? batch[0] : `OR(${batch.join(', ')})`;

      const records = await tables.orders
        .select({
          filterByFormula,
          sort: [{ field: 'Order Id', direction: 'asc' }],
        })
        .all();

      records.forEach((record) => {
        const recordForms = buildOrderIdForms(record.fields['Order Id']).comparisonForms;
        if (recordForms.size === 0) {
          return;
        }

        const mapped: StockOrderLineItem = {
          id: record.id,
          fields: castRecordFields<StockOrderLineItem['fields']>(record.fields),
        };

        const matchedOrders: string[] = [];

        for (const { orderNumber, comparisonForms } of orderMatchers) {
          for (const form of recordForms) {
            if (comparisonForms.has(form)) {
              matchedOrders.push(orderNumber);
              break;
            }
          }
        }

        matchedOrders.forEach((orderNumber) => {
          const existing = results[orderNumber] ?? [];
          if (!existing.some((item) => item.id === mapped.id)) {
            existing.push(mapped);
            results[orderNumber] = existing;
          }
        });
      });
    }

    return results;
  },

  async getDispatchLog(uniqueOrderRecordId: string): Promise<DispatchLogEntry[]> {
    try {
      const records = await tables.dispatchLog
        .select({
          filterByFormula: `FIND('${escapeAirtableValue(uniqueOrderRecordId)}', ARRAYJOIN({Order Id}))`,
          sort: [{ field: 'Date Dispatched', direction: 'desc' }]
        })
        .all();

      return records.map(record => ({
        id: record.id,
        fields: castRecordFields<DispatchLogEntry['fields']>(record.fields)
      }));
    } catch (error) {
      console.error('Error fetching dispatch log:', error);
      throw formatAirtableError(error, 'dispatch log fetch');
    }
  },

  async updateStockOrderLinesFromPicking(pickedItems: StockOrderPickedUpdateInput[]) {
    try {
      await updateStockOrderLineItems(pickedItems);
    } catch (error) {
      console.error('Error updating stock order line items:', error);
      throw formatAirtableError(error, 'stock order line items update');
    }
  },

  async updateDispatchLogEntries(updates: DispatchLogUpdateInput[]) {
    try {
      await updateDispatchLogEntries(updates);
    } catch (error) {
      console.error('Error updating dispatch log entries:', error);
      throw formatAirtableError(error, 'dispatch log update');
    }
  },

  async getPickingQueue(): Promise<UniqueOrder[]> {
    try {
      const records = await tables.uniqueOrders
        .select({
          filterByFormula: "OR({Pick Status} = '', {Pick Status} = BLANK())",
          sort: [
            { field: 'Date Ordered', direction: 'asc' },
            { field: 'Item Category', direction: 'asc' }
          ],
        })
        .all();

      return records.map((record) => ({
        id: record.id,
        fields: castRecordFields<UniqueOrder['fields']>(record.fields),
      }));
    } catch (error) {
      console.error('Error fetching picking queue:', error);
      throw formatAirtableError(error, 'picking queue fetch');
    }
  },

  async getDispatchQueue(): Promise<DispatchQueueOrder[]> {
    try {
      const records = await tables.uniqueOrders
        .select({
          sort: [
            { field: 'Date Ordered', direction: 'asc' },
            { field: 'Item Category', direction: 'asc' },
          ],
        })
        .all();

      if (!records.length) {
        return [];
      }

      const orders: UniqueOrder[] = records
        .map((record) => ({
          id: record.id,
          fields: castRecordFields<UniqueOrder['fields']>(record.fields),
        }))
        .filter((order) => {
          const pickStatus = coerceToString(order.fields['Pick Status']);
          const dispatchStatus = coerceToString(order.fields['Dispatch Status']);

          return pickStatus && (!dispatchStatus || dispatchStatus.length === 0);
        });

      if (!orders.length) {
        return [];
      }

      const orderComparisonForms = new Map<string, Set<string>>();
      const dispatchLogClauses = new Set<string>();
      const dispatchLogRecordIdToOrderId = new Map<string, string>();

      orders.forEach((order) => {
        const { stringValues, numericValues, comparisonForms } = buildOrderIdForms(order.fields['Order ID']);
        orderComparisonForms.set(order.id, comparisonForms);

        const dispatchLogLinks = Array.isArray(order.fields['Dispatch Log'])
          ? order.fields['Dispatch Log']
          : [];

        dispatchLogLinks.forEach((logId) => {
          const normalizedLogId = coerceToString(logId);
          if (!normalizedLogId) {
            return;
          }

          dispatchLogClauses.add(`RECORD_ID()='${escapeAirtableValue(normalizedLogId)}'`);
          dispatchLogRecordIdToOrderId.set(normalizedLogId, order.id);
        });

        stringValues.forEach((value) => {
          dispatchLogClauses.add(`{Order Id} = '${escapeAirtableValue(value)}'`);
        });

        numericValues.forEach((value) => {
          dispatchLogClauses.add(`{Order Id} = ${value}`);
        });
      });

      const dispatchLogMatches = new Map<string, DispatchLogEntry[]>();

      if (dispatchLogClauses.size > 0) {
        const clauses = Array.from(dispatchLogClauses);
        const batches = chunkArray(clauses, 25);

        for (const batch of batches) {
          const dispatchRecords = await tables.dispatchLog
            .select({
              filterByFormula: batch.length === 1 ? batch[0] : `OR(${batch.join(', ')})`,
              sort: [{ field: 'Date Dispatched', direction: 'desc' }],
            })
            .all();

          dispatchRecords.forEach((record) => {
            const entry: DispatchLogEntry = {
              id: record.id,
              fields: castRecordFields<DispatchLogEntry['fields']>(record.fields),
            };

            const entryForms = buildOrderIdForms(entry.fields['Order Id']).comparisonForms;
            if (entryForms.size === 0) {
              const mappedOrderId = dispatchLogRecordIdToOrderId.get(entry.id);
              if (!mappedOrderId) {
                return;
              }

              const existingById = dispatchLogMatches.get(mappedOrderId) ?? [];
              if (!existingById.some((log) => log.id === entry.id)) {
                existingById.push(entry);
                dispatchLogMatches.set(mappedOrderId, existingById);
              }
              return;
            }

            for (const [orderId, orderForms] of orderComparisonForms.entries()) {
              let matched = false;

              if (dispatchLogRecordIdToOrderId.get(entry.id) === orderId) {
                const existing = dispatchLogMatches.get(orderId) ?? [];
                if (!existing.some((log) => log.id === entry.id)) {
                  existing.push(entry);
                  dispatchLogMatches.set(orderId, existing);
                }
                break;
              }

              for (const form of entryForms) {
                if (orderForms.has(form)) {
                  const existing = dispatchLogMatches.get(orderId) ?? [];
                  if (!existing.some((log) => log.id === entry.id)) {
                    existing.push(entry);
                    dispatchLogMatches.set(orderId, existing);
                  }
                  matched = true;
                  break;
                }
              }

              if (matched) {
                break;
              }
            }
          });
        }
      }

      const ordersWithDispatchLogs: DispatchQueueOrder[] = orders.map((order) => {
        const logs = (dispatchLogMatches.get(order.id) ?? []).slice();
        logs.sort((a, b) => {
          const aDate = a.fields['Date Dispatched'] ?? '';
          const bDate = b.fields['Date Dispatched'] ?? '';

          if (aDate && bDate) {
            if (aDate > bDate) return -1;
            if (aDate < bDate) return 1;
          } else if (aDate) {
            return -1;
          } else if (bDate) {
            return 1;
          }

          return a.id.localeCompare(b.id);
        });

        return {
          ...order,
          dispatchLogEntries: logs,
        };
      });

      ordersWithDispatchLogs.sort((a, b) => {
        const aDate = a.fields['Date Ordered'] ?? '';
        const bDate = b.fields['Date Ordered'] ?? '';

        if (aDate && bDate) {
          if (aDate > bDate) return -1;
          if (aDate < bDate) return 1;
        } else if (aDate) {
          return -1;
        } else if (bDate) {
          return 1;
        }

        const aBusinessLine = a.fields['Item Category'] ?? '';
        const bBusinessLine = b.fields['Item Category'] ?? '';
        return aBusinessLine.localeCompare(bBusinessLine);
      });

      return ordersWithDispatchLogs;
    } catch (error) {
      console.error('Error fetching dispatch queue:', error);
      throw formatAirtableError(error, 'dispatch queue fetch');
    }
  },

  async updateUniqueOrder(recordId: string, fields: Partial<UniqueOrder['fields']>): Promise<UniqueOrder> {
    try {
      const record = await tables.uniqueOrders.update(recordId, fields);
      return {
        id: record.id,
        fields: castRecordFields<UniqueOrder['fields']>(record.fields)
      };
    } catch (error) {
      console.error('Error updating unique order:', error);
      throw formatAirtableError(error, 'unique order update');
    }
  }
};

