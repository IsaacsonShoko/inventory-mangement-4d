# Column Name Audit Report - unique_orders Table
**Date**: 2025-12-02
**Purpose**: Identify ALL column name mismatches between database schema and TypeScript code

---

## ❌ CRITICAL MISMATCHES FOUND

### 1. **delivery_party → deliver_to_part**
**Database Column**: `deliver_to_part` (SUPABASE_SCHEMA.sql:239)
**Code Uses**: `delivery_party`
**Type**: delivery_party_enum

**Occurrences** (7 total):
- ❌ services-orders.ts:52 - OrderRow interface
- ❌ services-orders.ts:146 - CreateOrderInput interface
- ❌ services-orders.ts:359 - insert statement
- ❌ useAirtable.ts:179 - transformation layer
- ❌ useAirtable.ts:317 - display mapping (useOrders)
- ❌ useAirtable.ts:359 - display mapping (useOrderById)
- ❌ useAirtable.ts:429 - display mapping (useTrackingOrders)

**Impact**: **BLOCKING** - Current 400 error preventing order submission

---

### 2. **recipient_email → recipient_email_address**
**Database Column**: `recipient_email_address` (SUPABASE_SCHEMA.sql:250)
**Code Uses**: `recipient_email`
**Type**: TEXT

**Occurrences** (7 total):
- ❌ services-orders.ts:61 - OrderRow interface
- ❌ services-orders.ts:155 - CreateOrderInput interface
- ❌ services-orders.ts:368 - insert statement
- ❌ useAirtable.ts:188 - transformation layer
- ❌ useAirtable.ts:322 - display mapping (useOrders)
- ❌ useAirtable.ts:364 - display mapping (useOrderById)
- ❌ useAirtable.ts:434 - display mapping (useTrackingOrders)

**Impact**: **HIGH** - Will cause next 400 error after delivery_party is fixed

---

## ✅ CORRECTLY ALIGNED COLUMNS

| Database Column | Code Reference | Status |
|----------------|----------------|--------|
| `id` | `id` | ✅ OK |
| `order_id` | `order_id` | ✅ OK |
| `date_ordered` | `date_ordered` | ✅ OK |
| `item_category` | `item_category` | ✅ OK |
| `item_nature` | `item_nature` | ✅ OK |
| `quantity_ordered` | `quantity_ordered` | ✅ OK |
| `region` | `region` | ✅ OK |
| `contractor_company` | `contractor_company` | ✅ OK |
| `technician` | `technician` | ✅ OK |
| `ordered_by` | `ordered_by` | ✅ OK |
| `on_behalf_of` | `on_behalf_of` | ✅ OK |
| `pop_id` | `pop_id` | ✅ OK |
| `order_location` | `order_location` | ✅ OK |
| `warehouse_fulfilling` | `warehouse_fulfilling` | ✅ OK |
| `recipient_name` | `recipient_name` | ✅ OK |
| `recipient_company_name` | `recipient_company_name` | ✅ OK |
| `recipient_address` | `recipient_address` | ✅ OK |
| `recipient_contact_number` | `recipient_contact_number` | ✅ OK |
| `cell_phone_number` | `cell_phone_number` | ✅ OK (just fixed) |
| `dispatch_status` | `dispatch_status` | ✅ OK |
| `stock_availability` | `stock_availability` | ✅ OK |
| `pick_status` | `pick_status` | ✅ OK |
| `dispatch_method` | `dispatch_method` | ✅ OK |
| `waybill_number` | `waybill_number` | ✅ OK |
| `order_notes` | `order_notes` | ✅ OK |
| `order_summary_ai` | `order_summary_ai` | ✅ OK |
| `created_at` | `created_at` | ✅ OK |
| `updated_at` | `updated_at` | ✅ OK |

---

## 📊 Complete Database Schema Reference

From SUPABASE_SCHEMA.sql lines 226-271:

```sql
CREATE TABLE unique_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGSERIAL UNIQUE NOT NULL,
  date_ordered TIMESTAMP NOT NULL,
  item_category business_line_enum,
  item_nature item_nature_enum,
  quantity_ordered INTEGER,

  -- Location & Party Info
  region TEXT,
  contractor_company TEXT,
  technician TEXT,
  ordered_by TEXT NOT NULL,
  deliver_to_part delivery_party_enum,        ← MISMATCH
  on_behalf_of TEXT,
  pop_id TEXT,
  order_location TEXT,
  warehouse_fulfilling TEXT,

  -- Recipient Info
  recipient_name TEXT,
  recipient_company_name TEXT,
  recipient_address TEXT,
  recipient_contact_number TEXT,
  recipient_email_address TEXT,               ← MISMATCH
  cell_phone_number TEXT,

  -- Status Fields
  dispatch_status dispatch_status_enum DEFAULT 'Pending',
  stock_availability stock_availability_enum,
  pick_status pick_status_enum DEFAULT 'Pending',
  dispatch_method dispatch_method_enum,

  waybill_number TEXT,
  order_notes TEXT,
  order_summary_ai TEXT,

  -- SLA Tracking (not used in CreateOrderInput)
  sla_deadline TIMESTAMP,
  sla_status sla_status_enum DEFAULT 'on_track',
  sla_breached_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Fix Summary

**Total Mismatches**: 2 column names
**Total Occurrences**: 14 (7 per column)
**Files Affected**: 2
  - src/integrations/supabase/services-orders.ts
  - src/hooks/useAirtable.ts

**Fix Priority**: URGENT - Blocking production order submission

---

## ✅ Next Steps

1. ✅ Fix `delivery_party` → `deliver_to_part` (7 occurrences)
2. ✅ Fix `recipient_email` → `recipient_email_address` (7 occurrences)
3. ⚠️ Test end-to-end order submission
4. ⚠️ Verify no more PGRST204 column errors

---

## 📝 Notes

- This audit checked ONLY the `unique_orders` table
- The `stock_order` table was not audited (separate line items)
- UI form fields use camelCase (e.g., `deliveryParty`, `recipientEmail`)
- Transformation layer in useAirtable.ts converts UI → database format
- Database uses snake_case exclusively
