# Airtable to Supabase Migration Guide

This document outlines all changes required to migrate from Airtable to Supabase.

## Overview

### Files to Modify

| File | Changes Required |
|------|------------------|
| `src/pages/StockOrder.tsx` | Update imports and field access |
| `src/pages/PickingQueue.tsx` | Update imports and field access |
| `src/pages/PickingCart.tsx` | Update imports and field access |
| `src/pages/PickingCartNew.tsx` | Update imports and field access |
| `src/pages/DispatchQueue.tsx` | Update imports and field access |
| `src/pages/DispatchCart.tsx` | Update imports and field access |
| `src/lib/orders.ts` | Update type imports |
| `src/services/stockCountService.ts` | Replace Airtable with Supabase |

### Files Created (New)

- `src/integrations/supabase/services.ts` - All Supabase service functions
- `src/integrations/supabase/index.ts` - Export barrel
- `src/hooks/useSupabase.ts` - React Query hooks for Supabase

---

## Import Changes

### Hook Imports

```typescript
// BEFORE
import {
  useInventoryItems,
  useCreateOrder,
  usePickingQueue,
  // ... etc
} from '@/hooks/useAirtable';

// AFTER
import {
  useInventoryItems,
  useCreateOrder,
  usePickingQueue,
  // ... etc
} from '@/hooks/useSupabase';
```

### Type Imports

```typescript
// BEFORE
import type {
  CartItem,
  OrderFormData,
  UniqueOrder,
  StockOrderLineItem,
  DispatchLogEntry
} from '@/types/airtable';

// AFTER
import type {
  CartItem,
  OrderFormData,
  UniqueOrder,
  StockOrder,      // was StockOrderLineItem
  DispatchLog      // was DispatchLogEntry
} from '@/integrations/supabase/services';
```

### Service Imports

```typescript
// BEFORE
import {
  inventoryService,
  orderService
} from '@/integrations/airtable';
import type {
  StockOrderPickedUpdateInput,
  DispatchLogUpdateInput
} from '@/integrations/airtable';

// AFTER
import {
  inventoryService,
  orderService
} from '@/integrations/supabase';
import type {
  StockOrderPickedUpdateInput,
  DispatchLogUpdateInput
} from '@/integrations/supabase';
```

---

## ID Type Changes

Supabase uses numeric IDs instead of Airtable's string record IDs.

```typescript
// BEFORE (Airtable)
const recordId: string = 'rec123abc';
await orderService.getUniqueOrder(recordId);

// AFTER (Supabase)
const recordId: number = 123;
await orderService.getUniqueOrder(recordId);
```

### Affected Functions

- `useUniqueOrderRecord(recordId)` - now takes `number`
- `useStockOrderItems(orderNumber)` - now takes `number`
- `useDispatchLog(orderNumber)` - now takes `number`
- `orderService.updateUniqueOrder(recordId, fields)` - recordId is `number`
- `orderService.getStockOrderItems(orderNumber)` - orderNumber is `number`

---

## Field Name Mapping

### UniqueOrder / unique_orders

| Airtable Field | Supabase Column |
|----------------|-----------------|
| `'Order ID'` | `order_id` |
| `'Date Ordered'` | `date_ordered` |
| `'Item Category'` | `item_category` |
| `'Item Nature'` | `item_nature` |
| `'Region'` | `region` |
| `'Contractor Company'` | `contractor_company` |
| `'Technician'` | `technician` |
| `'Quantity Ordered'` | `quantity_ordered` |
| `'Dispatch Status'` | `dispatch_status` |
| `'Stock Availability'` | `stock_availability` |
| `'Pick Status'` | `pick_status` |
| `'Dispatch Method'` | `dispatch_method` |
| `'WayBill Number'` | `waybill_number` |
| `'Ordered by'` | `ordered_by` |
| `'On Behalf of'` | `on_behalf_of` |
| `'PoPID'` | `pop_id` |
| `'Deliver to Part'` | `deliver_to_part` |
| `'Recipient Name'` | `recipient_name` |
| `'Recipient Company Name'` | `recipient_company_name` |
| `'Recipient Address'` | `recipient_address` |
| `'Recipient Contact Number'` | `recipient_contact_number` |
| `'Recipient Email Address'` | `recipient_email_address` |
| `'Order Location'` | `order_location` |
| `'Warehouse Fulfilling'` | `warehouse_fulfilling` |
| `'Order Notes'` | `order_notes` |
| `'Order Summary (AI Generated)'` | `order_summary_ai` |
| `'CellPhone Number'` | `cell_phone_number` |

### StockOrder / stock_order (was StockOrderLineItem)

| Airtable Field | Supabase Column |
|----------------|-----------------|
| `'Order Id'` | `order_id` |
| `'Device Type'` | `device_type` |
| `'Date Ordered'` | `date_ordered` |
| `'Quantity ordered'` | `quantity_ordered` |
| `'QTY dispatched'` | `qty_dispatched` |
| `'Contractor Company'` | `contractor_company` |
| `'Region'` | `region` |
| `'Technician'` | `technician` |
| `'Waybill number'` | `waybill_number` |
| `'Dispatch / order'` | `dispatch_or_order` |
| `'Dispatch to'` | `dispatch_to` |
| `'Ordered by'` | `ordered_by` |
| `'Item Category'` | `item_category` |
| `'Item Description'` | `item_description` |
| `'Item Nature'` | `item_nature` |
| `'Order Location'` | `order_location` |
| `'Pick Status'` | `pick_status` |
| `'Warehouse Fulfilling'` | `warehouse_fulfilling` |

### DispatchLog / dispatch_log (was DispatchLogEntry)

| Airtable Field | Supabase Column |
|----------------|-----------------|
| `'Order Id'` | `order_id` |
| `'Date Dispatched'` | `date_dispatched` |
| `'Item Category'` | `item_category` |
| `'Item Nature'` | `item_nature` |
| `'Item Description'` | `item_description` |
| `'Device type'` | `device_type` |
| `'Quantity'` | `quantity` |
| `'Contractor Company'` | `contractor_company` |
| `'Region'` | `region` |
| `'Technician'` | `technician` |
| `'Dispatch Method'` | `dispatch_method` |
| `'Waybill number'` | `waybill_number` |
| `'Package Reference'` | `package_reference` |
| `'Pick Status'` | `pick_status` |
| `'Stock Availability'` | `stock_availability` |
| `'Warehouse Fulfilling'` | `warehouse_fulfilling` |
| `'Terminal Serial Number'` | `terminal_serial_number` |
| `'Cradle Serial Number'` | `cradle_serial_number` |
| `'Charger Serial Number'` | `charger_serial_number` |
| `'CashConnect Serial Number'` | `cashconnect_serial_number` |
| `'Charger Packed'` | `charger_packed` |
| `'Cables'` | `cables` |
| `'Packer'` | `packer` |
| `'Dispatcher'` | `dispatcher` |
| `'Shipped'` | `shipped` |

### InventoryItem / inventory_items

| Airtable Field | Supabase Column |
|----------------|-----------------|
| `'Device Type'` | `item_name` |
| `'Item_Description'` | `item_description` |
| `'Item_Category'` | `item_category` |
| `'Item_Nature'` | `item_nature` |
| `'Item_Url'` | `item_url` |

### PointOfPresence / point_of_presence

| Airtable Field | Supabase Column |
|----------------|-----------------|
| `'Name & Surname'` | `name_surname` |
| `'Contractor'` | `contractor` |
| `'Region'` | `region` |
| `'Email Address'` | `email_address` |
| `'Area Based'` | `area_based` |
| `'Location Code'` | `location_code` |
| `'Contact Number'` | `contact_number` |

---

## Code Migration Examples

### Example 1: Accessing Order Fields

```typescript
// BEFORE (Airtable)
const order: UniqueOrder = ...;
const orderId = order.fields['Order ID'];
const dateOrdered = order.fields['Date Ordered'];
const pickStatus = order.fields['Pick Status'];

// AFTER (Supabase)
const order: UniqueOrder = ...;
const orderId = order.order_id;
const dateOrdered = order.date_ordered;
const pickStatus = order.pick_status;
```

### Example 2: Accessing Stock Order Items

```typescript
// BEFORE (Airtable)
const item: StockOrderLineItem = ...;
const deviceType = item.fields['Device Type'];
const qtyOrdered = item.fields['Quantity ordered'];
const qtyDispatched = item.fields['QTY dispatched'];

// AFTER (Supabase)
const item: StockOrder = ...;
const deviceType = item.device_type;
const qtyOrdered = item.quantity_ordered;
const qtyDispatched = item.qty_dispatched;
```

### Example 3: Using Hooks with Number IDs

```typescript
// BEFORE (Airtable)
const { data: order } = useUniqueOrderRecord(recordId); // recordId is string
const orderNumber = String(order?.fields['Order ID']);

// AFTER (Supabase)
const { data: order } = useUniqueOrderRecord(recordId); // recordId is number
const orderNumber = order?.order_id; // already a number
```

### Example 4: Update Mutations

```typescript
// BEFORE (Airtable)
updateOrder.mutate({
  recordId: order.id,  // string
  fields: {
    'Pick Status': 'Picked',
    'Dispatch Status': 'Pending'
  }
});

// AFTER (Supabase)
updateOrder.mutate({
  recordId: order.id,  // number
  fields: {
    pick_status: 'Picked',
    dispatch_status: 'Pending'
  }
});
```

### Example 5: Mapping Over Results

```typescript
// BEFORE (Airtable)
orders.map(order => (
  <div key={order.id}>
    <span>{formatOrderNumber(order.fields['Order ID'])}</span>
    <span>{order.fields['Recipient Name']}</span>
  </div>
));

// AFTER (Supabase)
orders.map(order => (
  <div key={order.id}>
    <span>{formatOrderNumber(order.order_id)}</span>
    <span>{order.recipient_name}</span>
  </div>
));
```

---

## Type Rename Summary

| Airtable Type | Supabase Type |
|---------------|---------------|
| `UniqueOrder` | `UniqueOrder` (same name, different structure) |
| `StockOrderLineItem` | `StockOrder` |
| `DispatchLogEntry` | `DispatchLog` |
| `InventoryItem` | `InventoryItem` (same name, different structure) |
| `PointOfPresence` | `PointOfPresence` (same name, different structure) |
| `DispatchQueueOrder` | `DispatchQueueOrder` (same name, uses new types) |

---

## Enum Types

Supabase provides strongly-typed enums. Import them when needed:

```typescript
import type {
  BusinessLineEnum,      // 'Absa' | 'Cash Connect' | 'VPS' | ...
  ItemNatureEnum,        // 'Serialised' | 'Non-serialised'
  PickStatusEnum,        // 'Pending' | 'Picked' | 'Partially Picked' | 'Not Picked'
  DispatchStatusEnum,    // 'Pending' | 'Dispatched' | 'Partial' | 'Cancelled' | 'Returned'
  DispatchMethodEnum,    // 'Courier' | 'In-house Delivery' | 'Pickup' | 'Other'
  DeliveryPartyEnum,     // 'Technician' | 'Regional Warehouse' | 'Non Technician'
} from '@/integrations/supabase/services';
```

---

## Checklist

- [ ] Update imports in `StockOrder.tsx`
- [ ] Update imports in `PickingQueue.tsx`
- [ ] Update imports in `PickingCart.tsx`
- [ ] Update imports in `PickingCartNew.tsx`
- [ ] Update imports in `DispatchQueue.tsx`
- [ ] Update imports in `DispatchCart.tsx`
- [ ] Update imports in `lib/orders.ts`
- [ ] Update `stockCountService.ts` to use Supabase
- [ ] Test all pages work correctly
- [ ] Remove Airtable dependencies from `package.json`
- [ ] Delete old Airtable files

---

## After Migration

Once all components are updated, you can remove:

1. `src/integrations/airtable/` directory
2. `src/hooks/useAirtable.ts`
3. `src/types/airtable.ts`
4. Airtable environment variables from `.env`
5. `airtable` package from `package.json`

Run:
```bash
npm uninstall airtable
```
