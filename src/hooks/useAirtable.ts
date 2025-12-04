/**
 * React Query hooks for Orders System
 * Now powered by Supabase (migrated from Airtable)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryCatalogService,
  pointOfPresenceService,
  ordersService,
  dispatchLogService,
  formatOrderNumber,
  type OrderRow,
  type OrderLineItemRow,
  type DispatchLogRow,
  type ItemCategoryEnum,
  type ItemNatureEnum,
  type DeliveryPartyEnum,
  type PickStatusEnum,
} from '@/integrations/supabase/services-orders';
import { n8nService } from '@/integrations/n8n';

// Legacy type exports for backward compatibility
export interface OrderFormData {
  dateOrdered: Date;
  itemCategory: string;
  itemNature: string;
  deliveryParty: 'Technician' | 'Regional Warehouse' | 'Non Technician' | '';
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

// Inventory Hooks
export const useInventoryItems = (filters?: { category?: string; serialized?: string }) => {
  return useQuery({
    queryKey: ['inventory', filters?.category ?? null, filters?.serialized ?? null],
    queryFn: async () => {
      const data = await inventoryCatalogService.getAll({
        category: filters?.category as ItemCategoryEnum | undefined,
        nature: filters?.serialized as ItemNatureEnum | undefined,
      });
      // Map to legacy format for backward compatibility
      return data.map(item => ({
        id: item.id,
        item_name: item.item_name,
        item_description: item.item_description || '',
        item_category: item.item_category,
        item_nature: item.item_nature,
        item_url: item.item_url,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useInventorySearch = (query: string, filters?: { category?: string; serialized?: string }) => {
  return useQuery({
    queryKey: ['inventory', 'search', query, filters?.category ?? null, filters?.serialized ?? null],
    queryFn: async () => {
      const data = await inventoryCatalogService.getAll({
        category: filters?.category as ItemCategoryEnum | undefined,
        nature: filters?.serialized as ItemNatureEnum | undefined,
        search: query,
      });
      return data.map(item => ({
        id: item.id,
        item_name: item.item_name,
        item_description: item.item_description || '',
        item_category: item.item_category,
        item_nature: item.item_nature,
        item_url: item.item_url,
      }));
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

// Point of Presence Hooks
export const usePointOfPresence = () => {
  return useQuery({
    queryKey: ['pointOfPresence'],
    queryFn: () => pointOfPresenceService.getAll(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useContractors = () => {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: () => pointOfPresenceService.getContractors(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useRegions = (contractor?: string, deliveryParty?: string) => {
  const contractorFilter = contractor && contractor !== 'select' ? contractor : undefined;
  const shouldFetch = deliveryParty === 'Regional Warehouse' ? true : !!contractorFilter;

  return useQuery({
    queryKey: ['regions', contractorFilter, deliveryParty],
    queryFn: () => pointOfPresenceService.getRegions(contractorFilter),
    enabled: shouldFetch,
    staleTime: 10 * 60 * 1000,
  });
};

export const useTechnicians = (contractor?: string, region?: string) => {
  const contractorFilter = contractor && contractor !== 'select' ? contractor : undefined;
  const regionFilter = region && region !== 'select' ? region : undefined;

  return useQuery({
    queryKey: ['technicians', contractorFilter, regionFilter],
    queryFn: () => pointOfPresenceService.getTechnicians(contractorFilter, regionFilter),
    enabled: !!contractorFilter && !!regionFilter,
    staleTime: 10 * 60 * 1000,
  });
};

export const useItemCategories = () => {
  return useQuery({
    queryKey: ['itemCategories'],
    queryFn: () => inventoryCatalogService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useItemNatures = (category?: string) => {
  const normalizedCategory = category && category !== 'select' ? category : undefined;

  return useQuery({
    queryKey: ['itemNatures', normalizedCategory],
    queryFn: () => inventoryCatalogService.getNaturesByCategory(normalizedCategory as ItemCategoryEnum | undefined),
    enabled: normalizedCategory !== undefined,
    staleTime: 10 * 60 * 1000,
  });
};

// Order Hooks
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersService.getAll(),
    staleTime: 1 * 60 * 1000,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formData, cartItems }: { formData: OrderFormData; cartItems: CartItem[] }) => {
      // Create order in Supabase
      const result = await ordersService.create({
        date_ordered: formData.dateOrdered.toISOString().split('T')[0],
        item_category: formData.itemCategory as ItemCategoryEnum,
        item_nature: formData.itemNature as ItemNatureEnum,
        deliver_to_part: formData.deliveryParty as DeliveryPartyEnum,
        contractor_company: formData.contractorCompany,
        region: formData.region,
        technician: formData.technician,
        pop_id: formData.popId,
        recipient_name: formData.recipientName,
        recipient_company_name: formData.recipientCompanyName,
        recipient_address: formData.recipientAddress,
        recipient_contact_number: formData.recipientContactNumber,
        recipient_email_address: formData.recipientEmail,
        ordered_by: formData.orderedBy,
        order_location: formData.orderLocation,
        cell_phone_number: formData.cellPhoneNumber,
      }, cartItems);

      const orderId = formatOrderNumber(result.orderNumber);

      // Send webhook to n8n for email notification
      try {
        await n8nService.notifyOrderPlaced({
          orderId,
          autoGeneratedOrderId: result.orderNumber,
          uniqueOrderRecordId: result.orderId,
          totalItems: cartItems.length,
          totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          dateOrdered: formData.dateOrdered.toISOString().split('T')[0],
          dateOrderedISO: formData.dateOrdered.toISOString(),
          orderedBy: formData.orderedBy,
          deliveryParty: formData.deliveryParty,
          contractorCompany: formData.contractorCompany || null,
          region: formData.region || null,
          formData: {
            dateOrdered: formData.dateOrdered.toISOString().split('T')[0],
            dateOrderedISO: formData.dateOrdered.toISOString(),
            itemCategory: formData.itemCategory,
            itemNature: formData.itemNature,
            deliveryParty: formData.deliveryParty,
            orderedBy: formData.orderedBy,
            contractorCompany: formData.contractorCompany || null,
            region: formData.region || null,
            technician: formData.technician || null,
            orderLocation: formData.orderLocation || null,
            popId: formData.popId || null,
            recipientName: formData.recipientName || null,
            recipientCompanyName: formData.recipientCompanyName || null,
            recipientAddress: formData.recipientAddress || null,
            recipientContactNumber: formData.recipientContactNumber || null,
            recipientEmail: formData.recipientEmail || null,
            cellPhoneNumber: formData.cellPhoneNumber || null,
          },
          cartItems: cartItems.map(item => ({
            id: item.id,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            itemCategory: item.itemCategory,
            itemNature: item.itemNature,
            quantity: item.quantity,
            itemUrl: item.itemUrl || null,
          })),
          lineItems: cartItems.map((item, index) => ({
            orderId,
            autoGeneratedOrderId: result.orderNumber,
            uniqueOrderRecordId: result.orderId,
            dateOrdered: formData.dateOrdered.toISOString().split('T')[0],
            dateOrderedISO: formData.dateOrdered.toISOString(),
            totalQuantity: cartItems.reduce((sum, i) => sum + i.quantity, 0),
            lineNumber: index + 1,
            cartLength: cartItems.length,
            itemCategory: item.itemCategory,
            itemNature: item.itemNature,
            deviceType: item.itemName,
            itemId: item.id,
            itemDescription: item.itemDescription,
            quantityOrdered: item.quantity,
            itemUrl: item.itemUrl || null,
            contractorCompany: formData.contractorCompany || null,
            region: formData.region || null,
            technician: formData.technician || null,
            orderedBy: formData.orderedBy,
            orderLocation: formData.orderLocation || null,
            deliverToPart: formData.deliveryParty,
            popId: formData.popId || null,
            recipientName: formData.recipientName || null,
            recipientCompanyName: formData.recipientCompanyName || null,
            recipientAddress: formData.recipientAddress || null,
            recipientContactNumber: formData.recipientContactNumber || null,
            recipientEmail: formData.recipientEmail || null,
            cellPhoneNumber: formData.cellPhoneNumber || null,
          })),
          items: cartItems.map(item => ({
            deviceType: item.itemName,
            quantityOrdered: item.quantity,
            itemUrl: item.itemUrl || null,
            itemDescription: item.itemDescription,
            itemCategory: item.itemCategory,
            itemNature: item.itemNature,
            itemId: item.id,
          })),
        });
      } catch (webhookError) {
        console.error('Failed to send order webhook:', webhookError);
        // Don't fail the order creation if webhook fails
      }

      return { orderId, orderRecordIds: [result.orderId] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'pickingQueue'] });
    },
  });
};

// Picking & Dispatch Queue Hooks
export const usePickingQueue = () => {
  return useQuery({
    queryKey: ['uniqueOrders', 'pickingQueue'],
    queryFn: async () => {
      const orders = await ordersService.getPickingQueue();
      // Map to legacy format
      return orders.map(order => ({
        id: order.id,
        fields: {
          'Order ID': order.order_number,
          'Date Ordered': order.date_ordered,
          'Item Category': order.item_category,
          'Item Nature': order.item_nature,
          'Region': order.region,
          'Contractor Company': order.contractor_company,
          'Technician': order.technician,
          'Quantity Ordered': order.quantity_ordered,
          'Dispatch Status': order.dispatch_status,
          'Pick Status': order.pick_status,
          'Ordered by': order.ordered_by,
          'On Behalf of': order.on_behalf_of,
          'Deliver to Part': order.deliver_to_part,
          'Recipient Name': order.recipient_name,
          'Recipient Company Name': order.recipient_company_name,
          'Recipient Address': order.recipient_address,
          'Recipient Contact Number': order.recipient_contact_number,
          'Recipient Email Address': order.recipient_email_address,
          'Order Location': order.order_location,
          'Warehouse Fulfilling': order.warehouse_fulfilling,
          'WayBill Number': order.waybill_number,
          'Order Notes': order.order_notes,
          'CellPhone Number': order.cell_phone_number,
        },
      }));
    },
    staleTime: 60 * 1000,
  });
};

export const useDispatchQueue = () => {
  return useQuery({
    queryKey: ['uniqueOrders', 'dispatchQueue'],
    queryFn: async () => {
      const orders = await ordersService.getDispatchQueue();
      // For each order, get dispatch log entries
      const ordersWithLogs = await Promise.all(
        orders.map(async (order) => {
          const dispatchLogs = await dispatchLogService.getByOrderId(order.id);
          return {
            id: order.id,
            fields: {
              'Order ID': order.order_number,
              'Date Ordered': order.date_ordered,
              'Item Category': order.item_category,
              'Item Nature': order.item_nature,
              'Region': order.region,
              'Contractor Company': order.contractor_company,
              'Technician': order.technician,
              'Quantity Ordered': order.quantity_ordered,
              'Dispatch Status': order.dispatch_status,
              'Pick Status': order.pick_status,
              'Ordered by': order.ordered_by,
              'On Behalf of': order.on_behalf_of,
              'Deliver to Part': order.deliver_to_part,
              'Recipient Name': order.recipient_name,
              'Recipient Company Name': order.recipient_company_name,
              'Recipient Address': order.recipient_address,
              'Recipient Contact Number': order.recipient_contact_number,
              'Recipient Email Address': order.recipient_email_address,
              'Order Location': order.order_location,
              'Warehouse Fulfilling': order.warehouse_fulfilling,
              'WayBill Number': order.waybill_number,
              'Order Notes': order.order_notes,
              'CellPhone Number': order.cell_phone_number,
            },
            dispatchLogEntries: dispatchLogs.map(log => ({
              id: log.id,
              fields: {
                'Order Id': [order.order_number],
                'Date Dispatched': log.date_dispatched,
                'Item Category': log.item_category,
                'Item Nature': log.item_nature,
                'Item Description': log.item_description,
                'Device type': log.device_type,
                'Quantity': log.quantity,
                'Contractor Company': log.contractor_company,
                'Region': log.region,
                'Technician': log.technician,
                'Dispatch Method': log.dispatch_method,
                'Waybill number': log.waybill_number,
                'Package Reference': log.package_reference,
                'Warehouse Fulfilling': log.warehouse_fulfilling,
                'Terminal Serial Number': log.terminal_serial_number,
                'Cradle Serial Number': log.cradle_serial_number,
                'Charger Serial Number': log.charger_serial_number,
                'CashConnect Serial Number': log.cashconnect_serial_number,
                'Charger Packed': log.charger_packed,
                'Cables': log.cables,
                'Packer': log.packer,
                'Dispatcher': log.dispatcher,
                'Shipped': log.shipped,
              },
            })),
          };
        })
      );
      return ordersWithLogs;
    },
    staleTime: 60 * 1000,
  });
};

export const useUniqueOrderRecord = (recordId?: string) => {
  return useQuery({
    queryKey: ['uniqueOrder', recordId],
    queryFn: async () => {
      const order = await ordersService.getById(recordId as string);
      if (!order) return null;
      return {
        id: order.id,
        fields: {
          'Order ID': order.order_number,
          'Date Ordered': order.date_ordered,
          'Item Category': order.item_category,
          'Item Nature': order.item_nature,
          'Region': order.region,
          'Contractor Company': order.contractor_company,
          'Technician': order.technician,
          'Quantity Ordered': order.quantity_ordered,
          'Dispatch Status': order.dispatch_status,
          'Pick Status': order.pick_status,
          'Ordered by': order.ordered_by,
          'On Behalf of': order.on_behalf_of,
          'Deliver to Part': order.deliver_to_part,
          'Recipient Name': order.recipient_name,
          'Recipient Company Name': order.recipient_company_name,
          'Recipient Address': order.recipient_address,
          'Recipient Contact Number': order.recipient_contact_number,
          'Recipient Email Address': order.recipient_email_address,
          'Order Location': order.order_location,
          'Warehouse Fulfilling': order.warehouse_fulfilling,
          'WayBill Number': order.waybill_number,
          'Order Notes': order.order_notes,
          'CellPhone Number': order.cell_phone_number,
        },
      };
    },
    enabled: Boolean(recordId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStockOrderItems = (orderNumber?: string) => {
  return useQuery({
    queryKey: ['stockOrderItems', orderNumber],
    queryFn: async () => {
      // First get the order by order number
      const orderNum = parseInt(orderNumber?.replace(/\D/g, '') || '0', 10);
      const order = await ordersService.getByOrderNumber(orderNum);
      if (!order) return [];

      const lineItems = await ordersService.getLineItems(order.id);
      return lineItems.map(item => ({
        id: item.id,
        fields: {
          'Order Id': order.order_number,
          'Device Type': item.device_type,
          'Date Ordered': order.date_ordered,
          'Quantity ordered': item.quantity_ordered,
          'QTY dispatched': item.quantity_dispatched,
          'Contractor Company': order.contractor_company,
          'Region': order.region,
          'Technician': order.technician,
          'Item Category': item.item_category,
          'Item Description': item.item_description,
          'Item Nature': item.item_nature,
          'Order Location': order.order_location,
          'Pick Status': item.pick_status,
          'Package Reference': item.package_reference,
          'Item Code': item.item_code,
          'Terminal Serial Number': item.terminal_serial_number,
          'Cradle Serial Number': item.cradle_serial_number,
          'Charger Serial Number': item.charger_serial_number,
          'CashConnect Serial Number': item.cashconnect_serial_number,
          'Charger Packed': item.charger_packed,
          'Cables': item.cables,
          'Packer': item.packer,
          'Dispatch Method': item.dispatch_method,
          'Warehouse Fulfilling': item.warehouse_fulfilling,
          'Waybill number': item.waybill_number,
          'Item Url': item.item_url,
          'Item_Url': item.item_url,
        },
      }));
    },
    enabled: Boolean(orderNumber),
    staleTime: 60 * 1000,
  });
};

export const useStockOrderItemsByOrders = (orderNumbers: string[]) => {
  const enabled = orderNumbers.length > 0;
  const cacheKey = enabled ? [...orderNumbers].sort().join('|') : null;

  return useQuery({
    queryKey: ['stockOrderItems', 'batch', cacheKey],
    queryFn: async () => {
      const results: Record<string, any[]> = {};

      for (const orderNumber of orderNumbers) {
        const orderNum = parseInt(orderNumber.replace(/\D/g, ''), 10);
        const order = await ordersService.getByOrderNumber(orderNum);
        if (!order) continue;

        const lineItems = await ordersService.getLineItems(order.id);
        results[orderNumber] = lineItems.map(item => ({
          id: item.id,
          fields: {
            'Order Id': order.order_number,
            'Device Type': item.device_type,
            'Quantity ordered': item.quantity_ordered,
            'QTY dispatched': item.quantity_dispatched,
            'Pick Status': item.pick_status,
            'Item Category': item.item_category,
            'Item Description': item.item_description,
            'Item Nature': item.item_nature,
            'Terminal Serial Number': item.terminal_serial_number,
            'Cradle Serial Number': item.cradle_serial_number,
            'Charger Serial Number': item.charger_serial_number,
            'CashConnect Serial Number': item.cashconnect_serial_number,
            'Charger Packed': item.charger_packed,
            'Cables': item.cables,
            'Packer': item.packer,
            'Item Url': item.item_url,
          },
        }));
      }

      return results;
    },
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useDispatchLog = (orderNumber?: string) => {
  return useQuery({
    queryKey: ['dispatchLog', orderNumber],
    queryFn: async () => {
      const orderNum = parseInt(orderNumber?.replace(/\D/g, '') || '0', 10);
      const order = await ordersService.getByOrderNumber(orderNum);
      if (!order) return [];

      const logs = await dispatchLogService.getByOrderId(order.id);
      return logs.map(log => ({
        id: log.id,
        fields: {
          'Order Id': [order.order_number],
          'Date Dispatched': log.date_dispatched,
          'Item Category': log.item_category,
          'Item Nature': log.item_nature,
          'Item Description': log.item_description,
          'Device type': log.device_type,
          'Quantity': log.quantity,
          'Contractor Company': log.contractor_company,
          'Region': log.region,
          'Technician': log.technician,
          'Dispatch Method': log.dispatch_method,
          'Waybill number': log.waybill_number,
          'Package Reference': log.package_reference,
          'Warehouse Fulfilling': log.warehouse_fulfilling,
          'Terminal Serial Number': log.terminal_serial_number,
          'Cradle Serial Number': log.cradle_serial_number,
          'Charger Serial Number': log.charger_serial_number,
          'CashConnect Serial Number': log.cashconnect_serial_number,
          'Charger Packed': log.charger_packed,
          'Cables': log.cables,
          'Packer': log.packer,
          'Dispatcher': log.dispatcher,
          'Shipped': log.shipped,
        },
      }));
    },
    enabled: Boolean(orderNumber),
    staleTime: 60 * 1000,
  });
};

export const useUpdateUniqueOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, fields }: { recordId: string; fields: Record<string, any> }) => {
      // Map legacy field names to Supabase column names
      const updates: Partial<OrderRow> = {};

      if (fields['Pick Status']) updates.pick_status = fields['Pick Status'] as PickStatusEnum;
      if (fields['Dispatch Status']) updates.dispatch_status = fields['Dispatch Status'] as any;
      if (fields['WayBill Number']) updates.waybill_number = fields['WayBill Number'];
      if (fields['Dispatch Method']) updates.dispatch_method = fields['Dispatch Method'] as any;
      if (fields['Warehouse Fulfilling']) updates.warehouse_fulfilling = fields['Warehouse Fulfilling'];
      if (fields['Order Notes']) updates.order_notes = fields['Order Notes'];

      return ordersService.update(recordId, updates);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'pickingQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders', 'dispatchQueue'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueOrder', variables.recordId] });
    },
  });
};

export const useUpdateStockOrderLines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pickedItems, orderNumber }: { pickedItems: StockOrderPickedUpdateInput[]; orderNumber?: string }) => {
      for (const item of pickedItems) {
        await ordersService.updateLineItem(item.stockOrderId, {
          quantity_dispatched: item.quantity,
          pick_status: item.pickStatus as PickStatusEnum,
        });
      }
    },
    onSuccess: (_result, variables) => {
      if (variables.orderNumber) {
        queryClient.invalidateQueries({ queryKey: ['stockOrderItems', variables.orderNumber] });
      }
      queryClient.invalidateQueries({ queryKey: ['uniqueOrders'] });
    },
  });
};

export const useUpdateDispatchLogEntries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates }: { updates: DispatchLogUpdateInput[] }) => {
      for (const update of updates) {
        await dispatchLogService.update(update.recordId, update.fields);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchLog'] });
    },
  });
};

// Legacy type exports
export type StockOrderPickedUpdateInput = {
  stockOrderId: string;
  quantity: number;
  pickStatus: string;
};

export type DispatchLogUpdateInput = {
  recordId: string;
  fields: Partial<DispatchLogRow>;
};
