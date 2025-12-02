# Database Table Audit Report
**Date**: 2025-12-02
**Purpose**: Verify all code table references match actual Supabase schema

---

## ✅ Tables Correctly Aligned

| Table Name | Schema Location | Code Usage | Status |
|------------|----------------|------------|--------|
| `user_profiles` | SUPABASE_SCHEMA.sql | services.ts, UserManagement.tsx | ✅ OK |
| `inventory_items` | SUPABASE_SCHEMA.sql | services.ts, StockOrder.tsx | ✅ OK |
| `point_of_presence` | SUPABASE_SCHEMA.sql | services.ts, multiple pages | ✅ OK |
| `unique_orders` | SUPABASE_SCHEMA.sql | services.ts, Tracking.tsx | ✅ OK (just fixed) |
| `stock_order` | SUPABASE_SCHEMA.sql | services.ts | ✅ OK |
| `dispatch_log` | SUPABASE_SCHEMA.sql | services.ts | ✅ OK |
| `device_registry` | create-asset-management-tables.sql | services.ts | ✅ OK (if migration run) |
| `repair_tickets` | create-asset-management-tables.sql | services.ts | ✅ OK (if migration run) |
| `device_movements` | create-asset-management-tables.sql | services.ts | ✅ OK (if migration run) |
| `ingestion_batches` | create-asset-management-tables.sql | services.ts | ✅ OK (if migration run) |
| `stock_levels` | create-stock-counts-tables.sql | services.ts | ✅ OK (if migration run) |
| `stock_counts` | create-stock-counts-tables.sql | services.ts | ✅ OK (if migration run) |
| `documents` | create-vector-table-documents.sql | chat.js (Netlify) | ✅ OK |

---

## ❌ Critical Issues Found

### 1. **Wrong Table Name: `order_line_items` → should be `stock_order`** ✅ FIXED
**Location**: `src/integrations/supabase/services-orders.ts:392, 478, 489`
**Problem**: Code uses old table name `order_line_items` instead of `stock_order`
**Impact**: Order line item operations will fail with 404 errors
**Solution**: Replace all instances of `order_line_items` with `stock_order`

```typescript
// services-orders.ts (3 locations)
.from('order_line_items')  // ❌ Old table name
.from('stock_order')       // ✅ Correct table name
```

---

## 📋 Schema Files Summary

### Main Schema
- **File**: `SUPABASE_SCHEMA.sql`
- **Tables**: 6 core tables + 6 views + triggers + functions
- **Status**: Complete and authoritative

### Migration Scripts
1. **create-asset-management-tables.sql** - Asset tracking module
   - `device_registry`, `repair_tickets`, `device_movements`, `ingestion_batches`

2. **create-stock-counts-tables.sql** - Stock counting module
   - `stock_levels`, `stock_counts`

3. **migrate-orders-to-supabase.sql** - ⚠️ OLD/DEPRECATED
   - Contains outdated `orders` and `order_line_items` tables
   - These were replaced by `unique_orders` and `stock_order`
   - Should probably be archived/renamed

---

## 📦 Storage Buckets (Not Database Tables)

| Bucket Name | Used By | Purpose | Status |
|-------------|---------|---------|--------|
| `assets` | StockAdmin.tsx:231, 239 | Image uploads for inventory items | ⚠️ Verify bucket exists |

**Note**: `supabase.storage.from('assets')` is for file storage, not database queries.

---

## 🔧 Fixes Required

### Priority 1: Critical (Breaks Functionality)

1. ✅ **FIXED**: Changed `orders` → `unique_orders` in services-orders.ts
2. ✅ **FIXED**: Changed `order_line_items` → `stock_order` in services-orders.ts (3 locations)

### Priority 2: Verification Needed
- Confirm all migration scripts have been run in Supabase:
  - `create-asset-management-tables.sql`
  - `create-stock-counts-tables.sql`
  - `create-vector-table-documents.sql`
  - `migration_add_user_profile_fields.sql`

---

## 📊 Statistics

- **Total tables in schema**: 13
- **Total tables referenced in code**: 13
- **Correctly aligned**: 13 (100%)
- **Issues found and FIXED**: 2
  - ✅ `orders` → `unique_orders`
  - ✅ `order_line_items` → `stock_order`
- **Storage buckets**: 1 (`assets` - needs verification)

---

## ✅ Next Steps

1. ✅ **DONE**: Fixed `order_line_items` → `stock_order` in services-orders.ts
2. ✅ **DONE**: Fixed `orders` → `unique_orders` in services-orders.ts
3. ⚠️ **TODO**: Verify `assets` storage bucket exists in Supabase Storage
4. ⚠️ **TODO**: Verify all migration scripts have been run in Supabase
5. ⚠️ **TODO**: Archive or rename `migrate-orders-to-supabase.sql` to avoid confusion
6. 🎯 **TODO**: Run end-to-end test again to verify fixes work
