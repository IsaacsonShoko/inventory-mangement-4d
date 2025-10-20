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
  DispatchLogEntry
} from '@/types/airtable';
import {
  n8nService,
  type OrderFormDataSnapshot,
  type CartItemSnapshot,
  type OrderLineWebhookPayload,
} from '@/integrations/n8n';

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

const create = async (formData: OrderFormData, cartItems: CartItem[]): Promise<{ orderId: string; orderRecordIds: string[] }> => {
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
        const formula = buildOrFormula('Dispatch Status', filters.dispatchStatuses, true);
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

  async createDispatchLogEntriesFromPicking(
    entries: StockOrderPickedUpdateInput[],
    options?: { uniqueOrderId?: string }
  ) {
    try {
      let uniqueOrder: UniqueOrder | null = null;
      if (options?.uniqueOrderId) {
        uniqueOrder = await this.getUniqueOrder(options.uniqueOrderId);
      }

      let stockOrderItems: StockOrderLineItem[] | undefined;
      if (uniqueOrder?.fields['Order ID']) {
        const orderNumber = formatOrderNumber(uniqueOrder);
        if (orderNumber) {
          stockOrderItems = await this.getStockOrderItems(orderNumber);
        }
      }

      await createDispatchLogEntries(entries, {
        uniqueOrder,
        stockOrderItems,
      });
    } catch (error) {
      console.error('Error creating dispatch log entries:', error);
      throw formatAirtableError(error, 'dispatch log creation');
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

  async getDispatchQueue(): Promise<UniqueOrder[]> {
    try {
      const dispatchRecords = await tables.dispatchLog
        .select({
          filterByFormula: "OR({Shipped} = '', {Shipped} = BLANK(), {Shipped} = 'No')",
          sort: [{ field: 'Date Dispatched', direction: 'desc' }],
        })
        .all();

      if (!dispatchRecords.length) {
        return [];
      }

      const uniqueOrderIds = new Set<string>();
      const dispatchDates = new Map<string, string | undefined>();

      dispatchRecords.forEach((record) => {
        const fields = castRecordFields<DispatchLogEntry['fields']>(record.fields);
        const linkedOrders = fields['Order Id'] ?? [];
        const dispatchedDate = fields['Date Dispatched'];

        linkedOrders.forEach((orderId) => {
          uniqueOrderIds.add(orderId);

          if (!dispatchDates.has(orderId)) {
            dispatchDates.set(orderId, dispatchedDate);
            return;
          }

          const existingDate = dispatchDates.get(orderId);
          if (dispatchedDate && (!existingDate || dispatchedDate > existingDate)) {
            dispatchDates.set(orderId, dispatchedDate);
          }
        });
      });

      if (!uniqueOrderIds.size) {
        return [];
      }

      const orders: UniqueOrder[] = [];
      const batches = chunkArray(Array.from(uniqueOrderIds), 25);

      for (const batch of batches) {
        const clauses = batch.map((orderId) => `RECORD_ID()='${escapeAirtableValue(orderId)}'`);
        const filterByFormula = clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;

        const records = await tables.uniqueOrders
          .select({
            filterByFormula,
            sort: [{ field: 'Date Ordered', direction: 'asc' }],
          })
          .all();

        records.forEach((record) => {
          orders.push({
            id: record.id,
            fields: castRecordFields<UniqueOrder['fields']>(record.fields),
          });
        });
      }

      orders.sort((a, b) => {
        const aDate = dispatchDates.get(a.id);
        const bDate = dispatchDates.get(b.id);

        if (aDate && bDate) {
          if (aDate > bDate) return -1;
          if (aDate < bDate) return 1;
        } else if (aDate) {
          return -1;
        } else if (bDate) {
          return 1;
        }

        const aOrdered = a.fields['Date Ordered'] ?? '';
        const bOrdered = b.fields['Date Ordered'] ?? '';
        if (aOrdered > bOrdered) return -1;
        if (aOrdered < bOrdered) return 1;
        return 0;
      });

      return orders;
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

